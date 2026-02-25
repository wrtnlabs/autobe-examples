import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_password_reset_token_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing password reset token by an authenticated registered user.
  // - Register and authenticate a new registered user.
  const joinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(joinConnection, {
    body: {},
  });
  // Prepare an authenticated connection for the user
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user.token.access },
  };
  // Simulate or assume creation of a password reset token for this user.
  // Since no API for creating password reset tokens is provided, generate a UUID as a placeholder for the existing token.
  const existingPasswordResetId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the existing password reset token
  await api.functional.discussionBoard.registeredUser.passwordResets.erasePasswordReset(
    userConnection,
    {
      passwordResetId: existingPasswordResetId,
    },
  );
  // No content response (204) expected, no assertion needed here as no response body.
  // TODO: Verify token deletion in DB and audit logs (out of scope for E2E).
  // Scenario 2: Attempt to delete a non-existent password reset token by the authenticated user.
  const fakePasswordResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent password reset token returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.passwordResets.erasePasswordReset(
        userConnection,
        {
          passwordResetId: fakePasswordResetId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized deletion attempt without authentication.
  const publicPasswordResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized deletion attempt returns 401",
    401,
    async () => {
      await api.functional.discussionBoard.registeredUser.passwordResets.erasePasswordReset(
        connection,
        {
          passwordResetId: publicPasswordResetId,
        },
      );
    },
  );
}
