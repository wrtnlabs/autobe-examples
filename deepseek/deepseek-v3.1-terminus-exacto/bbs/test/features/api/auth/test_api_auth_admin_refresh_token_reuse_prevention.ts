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
 * Test security mechanism that prevents refresh token reuse.
 * After successfully refreshing authentication tokens once,
 * attempt to use the original refresh_token again to verify it
 * has been properly invalidated. The system should reject the
 * reused refresh_token and require fresh authentication.
 */
export async function test_api_auth_admin_refresh_token_reuse_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  const originalRefreshToken = joinResult.token.refresh;
  // Successfully refresh tokens once
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedTokens =
    await api.functional.discussionBoard.auth.admin.refresh(refreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  typia.assert(refreshedTokens);
  // Attempt to reuse original refresh token
  await TestValidator.error(
    "Reused refresh_token should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(
        { host: connection.host },
        {
          body: {
            refresh_token: originalRefreshToken,
          } satisfies IDiscussionBoardAdmin.IRefresh,
        },
      );
    },
  );
}
