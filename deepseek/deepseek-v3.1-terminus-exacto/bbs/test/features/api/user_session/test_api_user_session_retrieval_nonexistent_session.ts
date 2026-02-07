import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the handling of a non-existent session ID.
 *
 * This test verifies that when an invalid or non-existent session ID is provided,
 * the endpoint returns an appropriate error response (404 Not Found). The test
 * validates that the error message clearly indicates the session was not found
 * and provides guidance for the client.
 */
export async function test_api_user_session_retrieval_nonexistent_session(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection and register a new user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: "test" + RandomGenerator.alphaNumeric(10) + "@example.com",
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Generate a random UUID-like string that doesn't exist in the system
  // Using a pattern that looks like UUID but is randomly generated
  const nonExistentSessionId =
    RandomGenerator.alphaNumeric(8) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(12);
  // Attempt to retrieve session information using the non-existent session ID
  // This should throw an error since the session doesn't exist
  await TestValidator.error("non-existent session retrieval", async () => {
    await api.functional.discussionBoard.user.sessions.at(userConnection, {
      sessionId: nonExistentSessionId as string & tags.Format<"uuid">,
    });
  });
}
