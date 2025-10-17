import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserRefresh";

/**
 * Validate admin session refresh flow immediately after registration.
 *
 * Steps:
 *
 * 1. Register a new admin account to obtain initial authorized payload (with
 *    refresh token).
 * 2. Refresh session using the initial refresh token; assert identity consistency.
 * 3. Refresh again using the newly returned refresh token; assert identity
 *    consistency again.
 *
 * Business validations:
 *
 * - Response types conform to ICommunityPlatformAdminUser.IAuthorized (via
 *   typia.assert).
 * - The subject id remains constant across join and all refresh responses.
 * - Role, when present, is either "adminUser" or omitted (optional field).
 *
 * Notes:
 *
 * - No assumptions about token rotation; only verify successful issuance and
 *   identity stability.
 * - Never touch connection.headers; SDK handles Authorization automatically.
 */
export async function test_api_admin_session_refresh_success_after_join(
  connection: api.IConnection,
) {
  // 1) Register a new admin
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12), // ^[A-Za-z0-9_]{3,20}$ satisfied by [a-z0-9]
    password: `a1${RandomGenerator.alphaNumeric(10)}`, // ensure at least one letter and one number
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const joined: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: joinBody });
  typia.assert(joined);

  // 2) First refresh with the initial refresh token
  const refreshBody1 = {
    refresh_token: joined.token.refresh,
  } satisfies ICommunityPlatformAdminUserRefresh.ICreate;

  const refreshed1: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: refreshBody1,
    });
  typia.assert(refreshed1);

  // Identity must stay the same
  TestValidator.equals(
    "admin id remains the same after first refresh",
    refreshed1.id,
    joined.id,
  );

  // Optional: role should be either omitted or explicitly "adminUser"
  TestValidator.predicate(
    "role is either omitted or 'adminUser' on first refresh",
    refreshed1.role === undefined || refreshed1.role === "adminUser",
  );

  // 3) Second refresh using the newly minted refresh token
  const refreshBody2 = {
    refresh_token: refreshed1.token.refresh,
  } satisfies ICommunityPlatformAdminUserRefresh.ICreate;

  const refreshed2: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: refreshBody2,
    });
  typia.assert(refreshed2);

  TestValidator.equals(
    "admin id remains the same after second refresh",
    refreshed2.id,
    joined.id,
  );

  TestValidator.predicate(
    "role is either omitted or 'adminUser' on second refresh",
    refreshed2.role === undefined || refreshed2.role === "adminUser",
  );
}
