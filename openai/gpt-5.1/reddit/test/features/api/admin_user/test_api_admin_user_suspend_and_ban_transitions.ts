import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate administrative suspension and ban state transitions for an admin
 * user.
 *
 * Business context: Platform-level adminUser accounts can be partially enforced
 * via two boolean flags on ICommunityPlatformAdminuser: `is_suspended` for
 * temporary disablement and `is_banned` for permanent enforcement. This test
 * ensures that an authenticated admin can update another admin account (we
 * re-use the same admin A as subject) via the adminUsers.update endpoint and
 * that the flag transitions persist through successive updates.
 *
 * Scenario:
 *
 * 1. Register an adminUser (admin A) using auth.adminUser.join with a random
 *    username, email, and password. The SDK will automatically attach the
 *    returned access token to the `connection` headers, so subsequent calls are
 *    authenticated as admin A.
 * 2. Perform a canonical admin write by creating a system configuration entry via
 *    communityPlatform.adminUser.systemConfigs.create to satisfy the dependency
 *    that admin A can perform general admin writes.
 * 3. Call communityPlatform.adminUser.adminUsers.update with `username` equal to
 *    admin A's username and a body satisfying
 *    ICommunityPlatformAdminuser.IUpdate, setting:
 *
 *    - Is_suspended: true
 *    - Is_banned: false Assert the response type as ICommunityPlatformAdminuser and
 *         then verify the flag values with TestValidator, ensuring is_suspended
 *         is true and is_banned is false. Also verify that the `id`,
 *         `username`, and `email` in the updated entity still match those from
 *         the authorized join output.
 * 4. Call the same update endpoint again for the same username, now with body:
 *
 *    - Is_suspended: false
 *    - Is_banned: true Again, assert the response type and validate that
 *         is_suspended is false and is_banned is true while identity fields
 *         remain stable.
 * 5. Optionally, confirm that other fields (like is_super_admin) are untouched by
 *    these updates by comparing them between the original authorized payload
 *    and the final updated admin entity.
 *
 * No GET endpoint for admin users is available in the provided SDK, so this
 * test uses only the responses from the join and update operations to validate
 * persistence and correctness of the enforcement flags.
 */
export async function test_api_admin_user_suspend_and_ban_transitions(
  connection: api.IConnection,
) {
  // 1. Register admin A via join
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Keep baseline identity and privilege flags for later comparisons
  const baselineId = adminAuthorized.id;
  const baselineUsername = adminAuthorized.username;
  const baselineEmail = adminAuthorized.email;
  const baselineIsSuperAdmin = adminAuthorized.is_super_admin;

  // 2. Perform a canonical admin write: create a system configuration
  const systemConfigBody = {
    category: "auth",
    config_key: "max_login_attempts_for_admin_test",
    value: "5",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigBody,
      },
    );
  typia.assert<ICommunityPlatformSystemConfig>(systemConfig);

  // 3. Suspend the admin (is_suspended: true, is_banned: false)
  const suspendUpdateBody = {
    is_suspended: true,
    is_banned: false,
  } satisfies ICommunityPlatformAdminuser.IUpdate;

  const suspendedAdmin: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.update(
      connection,
      {
        username: baselineUsername,
        body: suspendUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformAdminuser>(suspendedAdmin);

  // Business assertions for suspended state
  TestValidator.equals(
    "suspended flag should be true after suspend update",
    suspendedAdmin.is_suspended,
    true,
  );
  TestValidator.equals(
    "banned flag should be false after suspend update",
    suspendedAdmin.is_banned,
    false,
  );
  TestValidator.equals(
    "admin id should remain stable after suspend update",
    suspendedAdmin.id,
    baselineId,
  );
  TestValidator.equals(
    "admin username should remain stable after suspend update",
    suspendedAdmin.username,
    baselineUsername,
  );
  TestValidator.equals(
    "admin email should remain stable after suspend update",
    suspendedAdmin.email,
    baselineEmail,
  );

  // 4. Ban the admin (is_suspended: false, is_banned: true)
  const banUpdateBody = {
    is_suspended: false,
    is_banned: true,
  } satisfies ICommunityPlatformAdminuser.IUpdate;

  const bannedAdmin: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.update(
      connection,
      {
        username: baselineUsername,
        body: banUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformAdminuser>(bannedAdmin);

  // Business assertions for banned state
  TestValidator.equals(
    "suspended flag should be false after ban update",
    bannedAdmin.is_suspended,
    false,
  );
  TestValidator.equals(
    "banned flag should be true after ban update",
    bannedAdmin.is_banned,
    true,
  );
  TestValidator.equals(
    "admin id should remain stable after ban update",
    bannedAdmin.id,
    baselineId,
  );
  TestValidator.equals(
    "admin username should remain stable after ban update",
    bannedAdmin.username,
    baselineUsername,
  );
  TestValidator.equals(
    "admin email should remain stable after ban update",
    bannedAdmin.email,
    baselineEmail,
  );

  // 5. Optional: ensure is_super_admin flag is not unintentionally changed
  TestValidator.equals(
    "super admin flag should not change through suspend/ban updates",
    bannedAdmin.is_super_admin,
    baselineIsSuperAdmin,
  );
}
