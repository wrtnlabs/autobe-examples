import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin session continuity and profile preservation during token refresh.
 *
 * This test validates that:
 * 1. Admin profile data remains consistent across refresh operations
 * 2. New token pairs are issued on each refresh
 * 3. Token timestamps are valid and properly set
 * 4. Multiple sequential refreshes maintain session integrity
 */
export async function test_api_admin_auth_refresh_session_continuity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account with specific profile data
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      name: adminName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Capture initial profile data
  const initialId = joinResult.id;
  const initialEmail = joinResult.email;
  const initialGrade = joinResult.grade;
  const initialName = joinResult.name;
  const initialCreatedAt = joinResult.created_at;
  // Validate initial profile data
  TestValidator.equals("initial email matches", initialEmail, adminEmail);
  TestValidator.equals("initial name matches", initialName, adminName);
  TestValidator.equals("initial grade is regular", initialGrade, "regular");
  TestValidator.predicate(
    "initial deleted_at is null",
    joinResult.deleted_at === null,
  );
  // Validate initial token structure
  TestValidator.predicate(
    "initial access token exists",
    joinResult.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    joinResult.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial token.access exists",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial token.refresh exists",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial expired_at is future",
    new Date(joinResult.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "initial token.expired_at is future",
    new Date(joinResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "initial refreshable_until is future",
    new Date(joinResult.token.refreshable_until) > new Date(),
  );
  // Store refresh tokens from each refresh for validation
  const refreshResults: IShoppingMallAdmin.IAuthorized[] = [];
  let currentRefreshToken = joinResult.refresh;
  // Step 2: Perform multiple sequential refreshes (5 times)
  const refreshCount = 5;
  for (let i = 0; i < refreshCount; i++) {
    const refreshConnection: api.IConnection = { host: connection.host };
    const refreshResult = await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh_token: currentRefreshToken,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
    typia.assert(refreshResult);
    refreshResults.push(refreshResult);
    // Update current refresh token for next iteration
    currentRefreshToken = refreshResult.refresh;
    // Step 3: Validate profile data remains consistent
    TestValidator.equals(
      `refresh ${i + 1}: id unchanged`,
      refreshResult.id,
      initialId,
    );
    TestValidator.equals(
      `refresh ${i + 1}: email unchanged`,
      refreshResult.email,
      initialEmail,
    );
    TestValidator.equals(
      `refresh ${i + 1}: grade unchanged`,
      refreshResult.grade,
      initialGrade,
    );
    TestValidator.equals(
      `refresh ${i + 1}: name unchanged`,
      refreshResult.name,
      initialName,
    );
    TestValidator.equals(
      `refresh ${i + 1}: created_at unchanged`,
      refreshResult.created_at,
      initialCreatedAt,
    );
    TestValidator.predicate(
      `refresh ${i + 1}: deleted_at is null`,
      refreshResult.deleted_at === null,
    );
    // Step 4: Validate token structure
    TestValidator.predicate(
      `refresh ${i + 1}: access token exists`,
      refreshResult.access.length > 0,
    );
    TestValidator.predicate(
      `refresh ${i + 1}: refresh token exists`,
      refreshResult.refresh.length > 0,
    );
    TestValidator.predicate(
      `refresh ${i + 1}: token.access exists`,
      refreshResult.token.access.length > 0,
    );
    TestValidator.predicate(
      `refresh ${i + 1}: token.refresh exists`,
      refreshResult.token.refresh.length > 0,
    );
    // Validate token timestamps are in the future
    TestValidator.predicate(
      `refresh ${i + 1}: expired_at is future`,
      new Date(refreshResult.expired_at) > new Date(),
    );
    TestValidator.predicate(
      `refresh ${i + 1}: token.expired_at is future`,
      new Date(refreshResult.token.expired_at) > new Date(),
    );
    TestValidator.predicate(
      `refresh ${i + 1}: refreshable_until is future`,
      new Date(refreshResult.token.refreshable_until) > new Date(),
    );
    // Validate access token expiry is within expected range (15-30 minutes from now)
    const expiredAtTime = new Date(refreshResult.expired_at).getTime();
    const now = Date.now();
    const minutesUntilExpiry = (expiredAtTime - now) / (1000 * 60);
    TestValidator.predicate(
      `refresh ${i + 1}: access expires in reasonable time`,
      minutesUntilExpiry > 10 && minutesUntilExpiry < 60,
    );
    // Validate refreshable_until is after expired_at (session duration longer than access token life)
    TestValidator.predicate(
      `refresh ${i + 1}: refreshable_until after expired_at`,
      new Date(refreshResult.token.refreshable_until) >
        new Date(refreshResult.expired_at),
    );
  }
  // Step 5: Verify tokens change between refreshes
  for (let i = 0; i < refreshResults.length - 1; i++) {
    TestValidator.notEquals(
      `access tokens differ between refresh ${i + 1} and ${i + 2}`,
      refreshResults[i].access,
      refreshResults[i + 1].access,
    );
    TestValidator.notEquals(
      `refresh tokens differ between refresh ${i + 1} and ${i + 2}`,
      refreshResults[i].refresh,
      refreshResults[i + 1].refresh,
    );
  }
  // Step 6: Verify all profile data across all refreshes is identical
  for (let i = 0; i < refreshResults.length; i++) {
    TestValidator.equals(
      `all refreshes: id consistent ${i + 1}`,
      refreshResults[i].id,
      initialId,
    );
    TestValidator.equals(
      `all refreshes: email consistent ${i + 1}`,
      refreshResults[i].email,
      initialEmail,
    );
    TestValidator.equals(
      `all refreshes: grade consistent ${i + 1}`,
      refreshResults[i].grade,
      initialGrade,
    );
    TestValidator.equals(
      `all refreshes: name consistent ${i + 1}`,
      refreshResults[i].name,
      initialName,
    );
    TestValidator.equals(
      `all refreshes: created_at consistent ${i + 1}`,
      refreshResults[i].created_at,
      initialCreatedAt,
    );
  }
}
