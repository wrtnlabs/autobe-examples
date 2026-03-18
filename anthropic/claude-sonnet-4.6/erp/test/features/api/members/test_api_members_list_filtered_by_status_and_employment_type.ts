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

export async function test_api_members_list_filtered_by_status_and_employment_type(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Setup: Register the owner member ───────────────────────────────────
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // ─── 2. Create organization ─────────────────────────────────────────────────
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // The owner's organization member record and role
  const ownerOrgMember = organization.owner;
  const ownerRoleId = ownerOrgMember.role.id;
  // ─── 3. Register contractor member ─────────────────────────────────────────
  const contractorMemberConnection: api.IConnection = { host: connection.host };
  const contractorAuth = await authorize_member_join(
    contractorMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(contractorAuth);
  // ─── 4. Register full-time member ──────────────────────────────────────────
  const fullTimeMemberConnection: api.IConnection = { host: connection.host };
  const fullTimeAuth = await authorize_member_join(fullTimeMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(fullTimeAuth);
  // ─── 5. Find Employee role id ───────────────────────────────────────────────
  // We need to find a non-Owner role to assign to the new members.
  // First, add contractor with a role. We'll discover the Employee role by looking
  // at the returned org member. We need an "Employee" built-in role.
  // We'll use the owner connection to add members. The roleId must be from the org.
  // Since we don't have a role list endpoint, we'll add one member and get the role from the result.
  // Add contractor member to organization (use a placeholder roleId from generate function)
  // The generate function calls prepare_random_erp_hrm_organization_member which may random a roleId.
  // We need the actual Employee role UUID. Let's add the contractor and extract the role.
  const contractorOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: contractorAuth.id,
          employmentType: "contractor",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(contractorOrgMember);
  const employeeRoleId = contractorOrgMember.role.id;
  // ─── 6. Add full-time member to organization ────────────────────────────────
  const fullTimeOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: fullTimeAuth.id,
          employmentType: "full-time",
          roleId: employeeRoleId,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(fullTimeOrgMember);
  // ─── 7. Deactivate the contractor member ────────────────────────────────────
  const deactivatedContractor =
    await api.functional.erpHrm.member.organizationMembers.deactivate(
      ownerConnection,
      {
        organizationMemberId: contractorOrgMember.id,
      },
    );
  typia.assert(deactivatedContractor);
  TestValidator.equals(
    "contractor deactivated",
    deactivatedContractor.status,
    "deactivated",
  );
  // ─── TEST A: Filter by status=active ────────────────────────────────────────
  const activeResult = await api.functional.erpHrm.members.index(
    ownerConnection,
    {
      body: {
        status: "active",
      } satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(activeResult);
  // All returned members must be active
  for (const member of activeResult.data) {
    TestValidator.equals("member status is active", member.status, "active");
  }
  // The deactivated contractor must NOT appear
  const contractorInActive = activeResult.data.find(
    (m) => m.id === contractorOrgMember.id,
  );
  TestValidator.predicate(
    "deactivated contractor not in active results",
    contractorInActive === undefined,
  );
  // ─── TEST B: Filter by employment_type=contractor ────────────────────────────
  const contractorResult = await api.functional.erpHrm.members.index(
    ownerConnection,
    {
      body: {
        employment_type: "contractor",
      } satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(contractorResult);
  // All returned must have employment_type === 'contractor'
  for (const member of contractorResult.data) {
    TestValidator.equals(
      "member employment_type is contractor",
      member.employment_type,
      "contractor",
    );
  }
  // The deactivated contractor should appear
  const contractorInList = contractorResult.data.find(
    (m) => m.id === contractorOrgMember.id,
  );
  TestValidator.predicate(
    "contractor appears in contractor filter",
    contractorInList !== undefined,
  );
  // ─── TEST C: Combined filters status=active AND employment_type=full-time ────
  const combinedResult = await api.functional.erpHrm.members.index(
    ownerConnection,
    {
      body: {
        status: "active",
        employment_type: "full-time",
      } satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(combinedResult);
  // All returned must have BOTH status=active AND employment_type=full-time
  for (const member of combinedResult.data) {
    TestValidator.equals(
      "combined filter: status is active",
      member.status,
      "active",
    );
    TestValidator.equals(
      "combined filter: employment_type is full-time",
      member.employment_type,
      "full-time",
    );
  }
  // Pagination records count matches data count (or at least records >= data.length)
  TestValidator.predicate(
    "pagination records matches",
    combinedResult.pagination.records >= combinedResult.data.length,
  );
  // The full-time active member must appear
  const fullTimeInCombined = combinedResult.data.find(
    (m) => m.id === fullTimeOrgMember.id,
  );
  TestValidator.predicate(
    "full-time active member in combined results",
    fullTimeInCombined !== undefined,
  );
  // ─── TEST D: Filter by role_id (Employee role) ──────────────────────────────
  const roleFilterResult = await api.functional.erpHrm.members.index(
    ownerConnection,
    {
      body: {
        role_id: employeeRoleId,
      } satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(roleFilterResult);
  // All returned members must have the matching role ID
  for (const member of roleFilterResult.data) {
    TestValidator.equals(
      "member has employee role",
      member.role.id,
      employeeRoleId,
    );
  }
  // Owner should NOT appear (different role)
  const ownerInRoleFilter = roleFilterResult.data.find(
    (m) => m.id === ownerOrgMember.id,
  );
  TestValidator.predicate(
    "owner not in employee role filter",
    ownerInRoleFilter === undefined,
  );
}
