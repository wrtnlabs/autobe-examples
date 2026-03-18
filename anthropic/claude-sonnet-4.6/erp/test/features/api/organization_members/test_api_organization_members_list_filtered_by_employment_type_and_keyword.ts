import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_members_list_filtered_by_employment_type_and_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register primary member and authenticate
  const primaryConnection: api.IConnection = { host: connection.host };
  const primaryAuth = await authorize_member_join(primaryConnection, {});
  typia.assert(primaryAuth);
  // primaryConnection.headers now contains Authorization token
  // 2. Create organization — primary member becomes owner
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      primaryConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register second member with a unique, recognizable email
  const contractorEmailPrefix = `contractor-${RandomGenerator.alphaNumeric(8)}`;
  const contractorEmail =
    `${contractorEmailPrefix}@example-test.com` as string &
      tags.Format<"email">;
  const secondConnection: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_member_join(secondConnection, {
    body: {
      email: contractorEmail,
    },
  });
  typia.assert(secondAuth);
  // 4. Add second member to organization as contractor
  // Use the owner's role id from the organization
  const ownerRoleId = organization.owner.role.id;
  const contractorMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      primaryConnection,
      {
        body: {
          memberId: secondAuth.member.id,
          roleId: ownerRoleId,
          employmentType: "contractor",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(contractorMember);
  // ===================== TEST 1: Filter by employment_type='contractor' =====================
  const contractorList =
    await api.functional.erpHrm.member.organizations.members.index(
      primaryConnection,
      {
        organizationId: organization.id,
        body: {
          employment_type: "contractor",
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(contractorList);
  // Verify contractor member is in results
  TestValidator.predicate(
    "contractor member appears in contractor filter result",
    () => contractorList.data.some((m) => m.member.id === secondAuth.member.id),
  );
  // Verify owner is NOT in contractor filter results (owner is full-time by default)
  TestValidator.predicate(
    "owner does NOT appear in contractor filter result",
    () =>
      !contractorList.data.some((m) => m.member.id === primaryAuth.member.id),
  );
  // Verify pagination records count matches data length
  TestValidator.predicate(
    "contractor filter records count matches data length",
    () => contractorList.pagination.records === contractorList.data.length,
  );
  // ===================== TEST 2: Keyword search by partial email of second member =====================
  const keyword = contractorEmailPrefix;
  const keywordList =
    await api.functional.erpHrm.member.organizations.members.index(
      primaryConnection,
      {
        organizationId: organization.id,
        body: {
          keyword: keyword,
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(keywordList);
  // Second member should appear in keyword search results
  TestValidator.predicate(
    "contractor member appears in keyword search result",
    () => keywordList.data.some((m) => m.member.id === secondAuth.member.id),
  );
  // Primary member should NOT appear (their email doesn't contain the contractor prefix)
  TestValidator.predicate(
    "primary member does NOT appear in keyword search",
    () => !keywordList.data.some((m) => m.member.id === primaryAuth.member.id),
  );
  // ===================== TEST 3: Empty result with employment_type='intern' =====================
  const internList =
    await api.functional.erpHrm.member.organizations.members.index(
      primaryConnection,
      {
        organizationId: organization.id,
        body: {
          employment_type: "intern",
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(internList);
  // Verify empty data array
  TestValidator.equals(
    "intern filter returns empty data array",
    internList.data,
    [],
  );
  // Verify pagination metadata reflects zero results
  TestValidator.equals(
    "intern filter pagination.records = 0",
    internList.pagination.records,
    0,
  );
  TestValidator.equals(
    "intern filter pagination.pages = 0",
    internList.pagination.pages,
    0,
  );
  TestValidator.equals(
    "intern filter pagination.current = 1",
    internList.pagination.current,
    1,
  );
  // ===================== TEST 4: Combined filter employment_type='contractor' + status='active' =====================
  const activeContractorList =
    await api.functional.erpHrm.member.organizations.members.index(
      primaryConnection,
      {
        organizationId: organization.id,
        body: {
          employment_type: "contractor",
          status: "active",
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(activeContractorList);
  // Contractor member should appear (newly added members are active by default)
  TestValidator.predicate(
    "active contractor appears in combined filter result",
    () =>
      activeContractorList.data.some(
        (m) => m.member.id === secondAuth.member.id,
      ),
  );
  // All results should be contractors with active status
  TestValidator.predicate(
    "all results in combined filter are contractor and active",
    () =>
      activeContractorList.data.every(
        (m) => m.employment_type === "contractor" && m.status === "active",
      ),
  );
}
