import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReply";

/**
 * Validate the correct listing and pagination of multiple replies for a given
 * topic.
 *
 * This scenario covers:
 *
 * 1. Member registration
 * 2. Topic creation as the member
 * 3. Posting multiple replies to the topic as the same member
 * 4. Guest/unauthenticated fetching of the replies list via the index (listing)
 *    endpoint
 * 5. Validation of reply count, pagination fields, reply content, and author
 *    linkage
 *
 * Steps:
 *
 * - Register a new member
 * - Create a topic as the registered member
 * - Post 3 replies to the topic as the member (with unique content)
 * - Fetch the replies list for the topic via the public API as a guest (no
 *   authentication)
 * - Check that all posted replies are present in the result (regardless of order)
 * - Validate that each listed reply belongs to the topic, has expected content,
 *   and correct author linkage
 * - Confirm pagination fields (pagination.records, pagination.limit, data.length)
 *   are correct
 */
export async function test_api_replies_listing_with_multiple_replies(
  connection: api.IConnection,
) {
  // 1. Register new member
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Create topic as member
  const topicInput = {
    subject: RandomGenerator.paragraph({ sentences: 5 }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicInput },
  );
  typia.assert(topic);

  // 3. Create multiple replies (as the member)
  const replyCount = 3;
  const replyInputs = ArrayUtil.repeat(
    replyCount,
    (i) =>
      ({
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 9,
        }) as string & tags.MinLength<3> & tags.MaxLength<2000>,
      }) satisfies IDiscussionBoardReply.ICreate,
  );
  const replies: IDiscussionBoardReply[] = [];
  for (const input of replyInputs) {
    const reply =
      await api.functional.discussionBoard.member.topics.replies.create(
        connection,
        {
          topicId: topic.id,
          body: input,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // 4. As guest (unauthenticated), fetch replies list for topic
  const guestConnection: api.IConnection = { ...connection, headers: {} };
  const result = await api.functional.discussionBoard.topics.replies.index(
    guestConnection,
    {
      topicId: topic.id,
      body: { page: 1, limit: 10 },
    },
  );
  typia.assert(result);

  // 5. Validate result contents
  TestValidator.predicate(
    "should have at least as many replies as posted",
    result.data.length >= replyCount,
  );
  TestValidator.predicate(
    "should contain all posted replies by ID",
    replies.every((created) =>
      result.data.some((listed) => listed.id === created.id),
    ),
  );
  for (const created of replies) {
    const listed = result.data.find((r) => r.id === created.id);
    TestValidator.predicate(
      `reply for '${created.content}' should exist in listing`,
      !!listed,
    );
    if (listed) {
      TestValidator.equals(
        "reply topic linkage matches",
        listed.topic_id,
        topic.id,
      );
      TestValidator.equals(
        "reply author_member_id matches",
        listed.author_member_id,
        member.id,
      );
      TestValidator.equals(
        "reply content matches",
        listed.content,
        created.content,
      );
    }
  }

  // 6. Validate pagination fields
  TestValidator.equals(
    "pagination current page correct",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= replyCount",
    result.pagination.records >= replyCount,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    result.pagination.pages >= 1,
  );
}
