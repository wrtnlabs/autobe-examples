import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test that built-in roles cannot be modified or updated.
 *
 * Validates the immutability of system-provided built-in roles (Owner, Manager, Employee) within an organization. After authenticating as a member and creating an organization (which automatically creates built-in roles), the test attempts to update the Owner role with a new name and description. The operation should be rejected with a 403 Forbidden error since built-in roles are immutable by design.
 *
 * This test ensures that the role update endpoint properly checks the is_built_in flag and rejects modification attempts for system-provided roles. The test verifies that the error response indicates the operation is forbidden, and that the built-in role's properties remain unchanged after the failed update attempt.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates an organization which automatically creates built-in roles (Owner, Manager, Employee).
 * 3. Retrieve organization roles to identify the Owner role ID.
 * 4. Attempt to update the Owner role with new name and description.
 * 5. Validate that the operation returns a 403 Forbidden error.
 * 6. Verify the Owner role remains unchanged by fetching it again.
 */
export async function test_api_role_update_builtin_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization (automatically creates built-in roles)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Retrieve roles to find the Owner role
  const rolesResponse = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        is_built_in: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(rolesResponse);
  const ownerRole = rolesResponse.data.find((role) => role.name === "Owner");
  TestValidator.predicate("Owner role exists", ownerRole !== undefined);
  typia.assertGuard(ownerRole!);
  TestValidator.equals("Owner is built-in", ownerRole.is_built_in, true);
  // 4. Attempt to update the built-in Owner role
  const updateBody = {
    name: "Modified Owner Role",
    description: "This should fail",
  } satisfies IHrmPlatformRole.IUpdate;
  // 5. Validate that updating built-in role returns 403 Forbidden
  await TestValidator.httpError(
    "built-in role update rejected",
    403,
    async () => {
      await api.functional.hrmPlatform.member.roles.update(memberConnection, {
        roleId: ownerRole.id,
        body: updateBody,
      });
    },
  );
  // 6. Verify the Owner role remains unchanged
  const rolesAfterAttempt = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        is_built_in: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(rolesAfterAttempt);
  const ownerRoleAfter = rolesAfterAttempt.data.find(
    (role) => role.name === "Owner",
  );
  TestValidator.predicate(
    "Owner role still exists",
    ownerRoleAfter !== undefined,
  );
  typia.assertGuard(ownerRoleAfter!);
  TestValidator.equals("Owner name unchanged", ownerRoleAfter.name, "Owner");
  TestValidator.equals(
    "Owner still built-in",
    ownerRoleAfter.is_built_in,
    true,
  );
}
