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

export async function test_api_registered_user_password_reset_enumeration_attack_protection(
  connection: api.IConnection,
): Promise<void> {
  // Test the business rule that password reset requests are not revealing enumeration information:
  // - Submit password reset requests with different email addresses.
  // - Confirm identical response for existing and non-existing emails to prevent enumeration attacks.
  // - Validate that the system behavior hides sensitive information about user existence.
  // 1. Create a registered user to test with a known email
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const authorizedUser = await authorize_registered_user_join(
    registeredUserConnection,
    { body: joinBody },
  );
  typia.assert(authorizedUser);
  // 2. Define two email payloads: one existing user email and one random non-existing email
  const existingEmailPayload = { email: joinBody.email };
  const nonExistingEmailPayload = {
    email: typia.random<string & tags.Format<"email">>(),
  };
  // 3. Submit password reset requests for both emails using direct fetch API calls to emulate request with email payload
  async function sendPasswordResetRequest(emailPayload: { email: string }) {
    // Use base connection
    const rawResponse = await fetch(
      `${connection.host}/discussionBoard/registeredUser/passwordResets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      },
    );
    const jsonResponse = await rawResponse.json();
    return { status: rawResponse.status, body: jsonResponse };
  }
  const [responseExisting, responseNonExisting] = await Promise.all([
    sendPasswordResetRequest(existingEmailPayload),
    sendPasswordResetRequest(nonExistingEmailPayload),
  ]);
  // 4. Validate identical HTTP status codes
  TestValidator.equals(
    "status code identical",
    responseExisting.status,
    responseNonExisting.status,
  );
  // 5. Validate identical response bodies keys
  TestValidator.equals(
    "response body keys identical",
    Object.keys(responseExisting.body).sort(),
    Object.keys(responseNonExisting.body).sort(),
  );
  // 6. Validate that response bodies are deeply equal (no enumeration leakage)
  TestValidator.equals(
    "response bodies equal",
    responseExisting.body,
    responseNonExisting.body,
  );
}
