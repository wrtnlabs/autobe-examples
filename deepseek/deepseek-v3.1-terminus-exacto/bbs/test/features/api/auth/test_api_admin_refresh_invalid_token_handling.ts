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
 * Test the handling of invalid or malformed refresh tokens for administrator authentication.
 * This test validates that the system correctly rejects various types of invalid refresh tokens
 * including malformed strings, tampered tokens, and non-existent tokens.
 */
export async function test_api_admin_refresh_invalid_token_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test malformed refresh token (random string)
  await TestValidator.error("malformed token should be rejected", async () => {
    await api.functional.discussionBoard.auth.admin.refresh(adminConnection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(32),
      } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  });
  // 3. Test tampered refresh token (modified valid token)
  await TestValidator.error("tampered token should be rejected", async () => {
    const validToken = admin.token.refresh;
    const tamperedToken =
      validToken.slice(0, -10) + RandomGenerator.alphaNumeric(10);
    await api.functional.discussionBoard.auth.admin.refresh(adminConnection, {
      body: {
        refresh_token: tamperedToken,
      } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  });
  // 4. Test non-existent refresh token (random UUID)
  await TestValidator.error(
    "non-existent token should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(adminConnection, {
        body: {
          refresh_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
  // 5. Verify that valid refresh token still works
  const refreshedAdmin = await authorize_admin_refresh(adminConnection, {
    body: {
      refresh_token: admin.token.refresh,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  TestValidator.equals("admin ID should match", refreshedAdmin.id, admin.id);
  TestValidator.equals("email should match", refreshedAdmin.email, admin.email);
}
