import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that guest users are forbidden from creating discussion topics.
 *
 * This test simulates an unauthenticated (guest) request to the topic creation
 * endpoint. It attempts to post a new topic using valid data, but without
 * authentication. The expected behavior is that the API denies the request,
 * returning a permission error (usually 401 or 403), and no topic is created.
 * This ensures that only logged-in members or admins can create discussion
 * board topics, and guest users have no authority for this action.
 *
 * Steps:
 *
 * 1. Prepare valid discussion board topic data (subject and content).
 * 2. Using a clean unauthenticated connection, call the topic creation API.
 * 3. Assert that a permission error is thrown and the topic is not created.
 */
export async function test_api_topic_creation_by_guest_forbidden(
  connection: api.IConnection,
) {
  // 1. Prepare valid topic creation data
  const createBody = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }), // min 5, max 120 chars
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 12,
    }), // min 10, max 4000 chars
  } satisfies IDiscussionBoardTopic.ICreate;

  // 2. Create unauthenticated (guest) connection
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt to create topic as guest and expect permission error
  await TestValidator.error(
    "guest cannot create discussion board topic",
    async () => {
      await api.functional.discussionBoard.member.topics.create(
        guestConnection,
        {
          body: createBody,
        },
      );
    },
  );
}
