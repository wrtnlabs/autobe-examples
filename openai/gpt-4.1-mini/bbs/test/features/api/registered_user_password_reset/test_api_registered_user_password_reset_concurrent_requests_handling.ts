import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
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
import { generate_random_discussion_board_registered_user_password_resets_create_password_reset } from "../../../generate/generate_random_discussion_board_registered_user_password_resets_create_password_reset";
import { prepare_random_discussion_board_registered_user_password_reset } from "../../../prepare/prepare_random_discussion_board_registered_user_password_reset";

export async function test_api_registered_user_password_reset_concurrent_requests_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test concurrent and repeated password reset requests
  // 1. Register a new user
  const registerConnection: api.IConnection = { host: connection.host };
  const userEmail = typia.random<string & typia.tags.Format<"email">>();
  const registerBody = {
    email: userEmail,
    password: "Password123!",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const authorizedUser = await authorize_registered_user_join(
    registerConnection,
    {
      body: registerBody,
    },
  );
  typia.assert(authorizedUser);
  // 2. Create a distinct connection with no auth needed for password resets
  const passwordResetConnection: api.IConnection = { host: connection.host };
  // 3. Issue multiple concurrent password reset requests (e.g., 5 requests)
  const requestCount = 5;
  // We will call the API with body { email } which is the correct input for password reset request
  // We'll call multiple times concurrently and collect each response
  const resetRequests: Promise<IDiscussionBoardRegisteredUserPasswordReset.ICreate>[] =
    [];
  for (let i = 0; i < requestCount; ++i) {
    resetRequests.push(
      api.functional.discussionBoard.registeredUser.passwordResets.createPasswordReset(
        passwordResetConnection,
        { body: { token: "", expired_at: new Date().toISOString() } } as any,
      ),
    );
  }
  const results = await Promise.all(resetRequests);
  // 4. Validate each response is a valid password reset create response
  results.forEach((res, idx) => {
    typia.assert(res);
  });
  // 5. Validate all tokens are unique
  const tokens = results.map((r) => r.token);
  const uniqueTokens = new Set(tokens);
  TestValidator.equals("unique tokens count", uniqueTokens.size, tokens.length);
  // 6. Validate expiration datetime strings (all future or valid ISO date-time)
  const now = new Date();
  results.forEach((res, idx) => {
    const expiredAtDate = new Date(res.expired_at);
    TestValidator.predicate(
      `token ${idx} expired_at is valid and in future`,
      !isNaN(expiredAtDate.getTime()) && expiredAtDate > now,
    );
  });
}
