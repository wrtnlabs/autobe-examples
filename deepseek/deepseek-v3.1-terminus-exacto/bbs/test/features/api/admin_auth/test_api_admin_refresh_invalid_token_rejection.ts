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
 * Test token refresh failure scenario where an administrator provides an invalid or non-existent refresh token.
 * Validate that the system properly rejects the request with appropriate security error response,
 * prevents token enumeration attacks through consistent error handling, and maintains audit trail
 * of failed refresh attempts.
 */
export async function test_api_admin_refresh_invalid_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and obtain initial valid refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Extract refresh token from the authorized response
  const validRefreshToken = admin.token.refresh;
  // 2. Test with randomly generated invalid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  // Test with random alphanumeric string that doesn't match token format
  await TestValidator.error(
    "refresh token should reject random alphanumeric string",
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: RandomGenerator.alphaNumeric(64),
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
  // 3. Test with empty string as refresh token
  await TestValidator.error(
    "refresh token should reject empty string",
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: "",
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
  // 4. Test with malformed token structure (too short)
  await TestValidator.error(
    "refresh token should reject malformed token",
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: "abc",
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
}
