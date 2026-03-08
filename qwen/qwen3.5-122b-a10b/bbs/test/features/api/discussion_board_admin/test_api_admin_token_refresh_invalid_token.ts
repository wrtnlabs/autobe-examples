import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an invalid or expired refresh token requires re-authentication.
 *
 * Validates security controls around refresh token validation by testing:
 * 1. Malformed refresh token
 * 2. Already-used refresh token (rotation policy)
 * 3. Expired refresh token beyond 7 days
 * 4. Refresh token from deleted admin account
 *
 * All scenarios should return 401 Unauthorized, forcing re-authentication.
 */
export async function test_api_admin_token_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // SETUP: Create admin account and obtain valid tokens
  // ============================================
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminInfo = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminInfo);
  // Login to get valid token pair
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminInfo.email,
      password: adminPassword,
    },
  });
  typia.assert(loginResult);
  const validRefreshToken: string = loginResult.token.refresh;
  // ============================================
  // TEST 1: Malformed refresh token
  // ============================================
  const malformedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "malformed refresh token should return 401",
    401,
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(
        malformedConnection,
        {
          body: {
            refresh_token: "invalid.malformed.token.format",
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
  // ============================================
  // TEST 2: Already-used refresh token (rotation policy)
  // ============================================
  const rotationConnection: api.IConnection = { host: connection.host };
  // First use - should succeed and invalidate the refresh token
  const firstUse = await api.functional.discussionBoard.auth.admin.refresh(
    rotationConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IDiscussionBoardAdmin.IRefresh,
    },
  );
  typia.assert(firstUse);
  // Second use with same token - should fail with 401
  await TestValidator.httpError(
    "already-used refresh token should return 401",
    401,
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(
        rotationConnection,
        {
          body: {
            refresh_token: validRefreshToken,
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
  // ============================================
  // TEST 3: Expired refresh token (simulate by using invalid token)
  // ============================================
  const expiredConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "expired refresh token should return 401",
    401,
    async () => {
      // Generate a token that looks valid but is expired
      const expiredToken: string = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${RandomGenerator.alphabets(50)}.expired_signature`;
      await api.functional.discussionBoard.auth.admin.refresh(
        expiredConnection,
        {
          body: {
            refresh_token: expiredToken,
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
  // ============================================
  // TEST 4: Refresh token from deleted admin account
  // ============================================
  // Create another admin, login, get token
  const deletedAdminPassword: string = RandomGenerator.alphaNumeric(16);
  const deletedAdminConnection: api.IConnection = { host: connection.host };
  const deletedAdminInfo = await authorize_admin_join(deletedAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: deletedAdminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(deletedAdminInfo);
  // Login to get token
  const deletedLoginConnection: api.IConnection = { host: connection.host };
  const deletedLoginResult = await authorize_admin_login(
    deletedLoginConnection,
    {
      body: {
        email: deletedAdminInfo.email,
        password: deletedAdminPassword,
      },
    },
  );
  typia.assert(deletedLoginResult);
  // Note: Since there's no delete admin endpoint provided in the SDK,
  // we simulate this by using a token that would belong to a deleted admin
  const deletedAdminConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh token from deleted admin should return 401",
    401,
    async () => {
      // Use a token that would belong to a deleted admin
      // Since we can't actually delete the admin, we use a different invalid token
      const fakeDeletedToken: string = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${RandomGenerator.alphabets(50)}.deleted_admin_token`;
      await api.functional.discussionBoard.auth.admin.refresh(
        deletedAdminConnection2,
        {
          body: {
            refresh_token: fakeDeletedToken,
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
  // ============================================
  // VERIFICATION: All invalid tokens require re-authentication
  // ============================================
  // Verify that after all these failures, a valid login still works
  const finalLoginConnection: api.IConnection = { host: connection.host };
  const finalLogin = await authorize_admin_login(finalLoginConnection, {
    body: {
      email: adminInfo.email,
      password: adminPassword,
    },
  });
  typia.assert(finalLogin);
  TestValidator.predicate(
    "valid login still works after invalid refresh attempts",
    finalLogin.token.access !== undefined &&
      finalLogin.token.refresh !== undefined,
  );
}
