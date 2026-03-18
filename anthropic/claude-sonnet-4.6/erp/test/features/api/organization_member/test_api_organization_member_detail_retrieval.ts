import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create an organization (owner is auto-added as Owner role member)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register a second platform member account
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: secondEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondMemberAuth);
  // Step 4: As the owner, add the second member to the organization
  // Use the owner's built-in role id as roleId
  const roleId = organization.owner.role.id;
  const newMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondMemberAuth.member.id,
          roleId: roleId,
          employmentType: "full-time",
          position: "Software Engineer",
          departmentId: null,
        },
      },
    );
  typia.assert(newMember);
  // Step 5: Retrieve the organization member detail
  const memberDetail =
    await api.functional.erpHrm.member.organizationMembers.at(ownerConnection, {
      organizationMemberId: newMember.id,
    });
  typia.assert(memberDetail);
  // Step 6: Validate the returned record (business logic assertions)
  TestValidator.equals(
    "id matches organizationMemberId",
    memberDetail.id,
    newMember.id,
  );
  TestValidator.equals(
    "organization_id matches",
    memberDetail.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "email matches second member",
    memberDetail.email,
    secondEmail,
  );
  TestValidator.equals(
    "employment_type is full-time",
    memberDetail.employment_type,
    "full-time",
  );
  TestValidator.equals("status is active", memberDetail.status, "active");
  TestValidator.equals(
    "position is Software Engineer",
    memberDetail.position,
    "Software Engineer",
  );
  TestValidator.equals("department is null", memberDetail.department, null);
  TestValidator.equals("deleted_at is null", memberDetail.deleted_at, null);
}
