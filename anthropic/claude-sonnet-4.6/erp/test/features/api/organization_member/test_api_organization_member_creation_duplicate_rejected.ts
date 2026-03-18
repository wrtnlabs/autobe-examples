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

export async function test_api_organization_member_creation_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the organization owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // Step 2: Create an organization — owner is automatically assigned the Owner role
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Extract a valid role ID from the organization (owner's role = Owner built-in role)
  const roleId = organization.owner.role.id;
  // Step 3: Register a second platform-level member (the target user)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(targetAuth);
  const targetMemberId = targetAuth.member.id;
  // Step 4 (Execution Step 1): Successfully add the target member as 'part-time'
  const firstMembership =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: targetMemberId,
          roleId: roleId,
          employmentType: "part-time",
        },
      },
    );
  typia.assert(firstMembership);
  // Validate the first addition succeeded with status 'active'
  TestValidator.equals(
    "first membership status is active",
    firstMembership.status,
    "active",
  );
  TestValidator.equals(
    "first membership member id matches target",
    firstMembership.email,
    targetAuth.member.email,
  );
  // Step 5 (Execution Step 2): Attempt duplicate addition with different employmentType — must fail
  await TestValidator.error(
    "duplicate member addition must be rejected",
    async () => {
      await generate_random_erp_hrm_member_organization_members_create(
        ownerConnection,
        {
          body: {
            memberId: targetMemberId,
            roleId: roleId,
            employmentType: "contractor",
          },
        },
      );
    },
  );
}
