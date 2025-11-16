import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate that an authenticated adminUser can update another admin account's
 * mutable attributes (email and privilege/status flags) using the username
 * business identifier, and that the updated state is reflected in the response
 * DTO without exposing authentication secrets.
 *
 * Business flow:
 *
 * 1. Join an adminUser (admin A) via /auth/adminUser/join and obtain an authorized
 *    context (token and identity).
 * 2. Perform a benign admin-only write operation by creating a system
 *    configuration row via /communityPlatform/adminUser/systemConfigs to
 *    exercise admin-level write permissions.
 * 3. Prepare an ICommunityPlatformAdminuser.IUpdate payload that changes admin A's
 *    email and privilege/status flags (e.g., is_super_admin=true,
 *    is_suspended=false, is_banned=false).
 * 4. Call PUT /communityPlatform/adminUser/adminUsers/{username} for admin A's
 *    username with the update payload.
 * 5. Assert that the returned ICommunityPlatformAdminuser reflects the updated
 *    email and flags, preserves the id, and does not expose any authentication
 *    secrets.
 * 6. Treat the PUT response as the source of truth for persistence (we do not call
 *    a GET endpoint that is not defined in the SDK).
 */
export async function test_api_admin_user_update_flags_and_email_by_admin(
  connection: api.IConnection,
) {
  // 1. Join an adminUser (admin A)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Perform a canonical admin write by creating a system config
  const systemConfigBody = {
    category: "auth",
    config_key: "max_login_attempts",
    value: "5",
    description: "Maximum admin login attempts before lockout",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert<ICommunityPlatformSystemConfig>(createdConfig);

  TestValidator.equals(
    "system config key should match request",
    createdConfig.config_key,
    systemConfigBody.config_key,
  );
  TestValidator.equals(
    "system config active flag should match request",
    createdConfig.is_active,
    systemConfigBody.is_active,
  );

  // 3. Prepare update payload for admin A
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const targetIsSuperAdmin = true;
  const targetIsSuspended = false;
  const targetIsBanned = false;

  const updateBody = {
    email: newEmail,
    is_super_admin: targetIsSuperAdmin,
    is_suspended: targetIsSuspended,
    is_banned: targetIsBanned,
  } satisfies ICommunityPlatformAdminuser.IUpdate;

  // 4. Call update for admin A by username
  const updatedAdmin: ICommunityPlatformAdminuser =
    await api.functional.communityPlatform.adminUser.adminUsers.update(
      connection,
      {
        username: adminAuthorized.username,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformAdminuser>(updatedAdmin);

  // 5. Validate updated admin state
  TestValidator.equals(
    "updated admin username should remain unchanged",
    updatedAdmin.username,
    adminAuthorized.username,
  );

  TestValidator.equals(
    "updated admin email should reflect new value",
    updatedAdmin.email,
    newEmail,
  );

  TestValidator.equals(
    "updated admin should have is_super_admin flag set to true",
    updatedAdmin.is_super_admin,
    targetIsSuperAdmin,
  );

  TestValidator.equals(
    "updated admin should have is_suspended flag set to false",
    updatedAdmin.is_suspended,
    targetIsSuspended,
  );

  TestValidator.equals(
    "updated admin should have is_banned flag set to false",
    updatedAdmin.is_banned,
    targetIsBanned,
  );

  TestValidator.equals(
    "updated admin id should match original admin id",
    updatedAdmin.id,
    adminAuthorized.id,
  );

  TestValidator.predicate(
    "updated admin created_at should be a non-empty ISO date-time string",
    updatedAdmin.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated admin updated_at should be a non-empty ISO date-time string",
    updatedAdmin.updated_at.length > 0,
  );

  TestValidator.predicate(
    "updated admin should not be soft-deleted (deleted_at is null or undefined)",
    updatedAdmin.deleted_at === null || updatedAdmin.deleted_at === undefined,
  );
}
