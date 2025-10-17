import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";

/**
 * Validates that posting a reply as an admin to a non-existent topic fails.
 *
 * 1. Registers a new admin with unique random credentials (email, username,
 *    password).
 * 2. Attempts to post a reply to a randomly generated topicId UUID to guarantee
 *    the topic does not exist.
 * 3. Expects the reply creation to be rejected with a not found (404) error.
 * 4. Verifies that admin registration is successful and validation is strict.
 */
export async function test_api_reply_creation_denied_for_invalid_topic_admin(
  connection: api.IConnection,
) {
  // Register a new admin
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: (RandomGenerator.name(1) +
          Math.floor(Math.random() * 10000) +
          "@example.com") as string & tags.Format<"email">,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.Format<"password">,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // Attempt to post a reply to a non-existent topic
  await TestValidator.error(
    "posting a reply to a non-existent topic should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.topics.replies.create(
        connection,
        {
          topicId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            content: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 4,
              wordMax: 12,
            }),
          } satisfies IDiscussionBoardReply.ICreate,
        },
      );
    },
  );
}
