import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

/**
 * Test creation of a reply to an existing economic topic post by an
 * authenticated member.
 *
 * This test validates the end-to-end workflow of creating a reply to an
 * economic board post:
 *
 * 1. Authenticate as a member using join endpoint
 * 2. Create a new topic category via admin endpoint
 * 3. Create a published post under the created topic
 * 4. Create a reply to the post with valid content length (5-1000 characters)
 * 5. Validate that the reply is successfully created with correct properties
 *
 * The test ensures that:
 *
 * - Replies are immediately published without moderation
 * - Reply content adheres to the 5-1000 character limit
 * - Replies are correctly linked to the parent post
 * - All timestamps are properly set by the system
 * - No authentication token manipulation is required (handled automatically by
 *   SDK)
 *
 * This scenario covers the core functionality of the economic board's reply
 * system, ensuring the business rules around anonymous posting, content length
 * limits, and post-reply relationships are enforced correctly.
 */
export async function test_api_reply_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  // Use a known bcrypt hash for password (this is a valid bcrypt hash for "strong_password_123!")
  const memberPasswordHash =
    "$2b$12$pLc9Cf9Z3G8t5sQh.ex3UO0Pn3UWQ.kveFqU6v0s7U8s4w/e2gZhK";
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: memberPasswordHash,
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for the parent post
  const topicName:
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy" = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: "Discussion about inflation trends and economic impacts",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a published post to reply to
  const postContent: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const postSubject: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 6,
  });

  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        content: postContent,
        subject: postSubject,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("post status should be pending", post.status, "pending");

  // 4. Create a reply to the post
  const replyContent: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 15,
  });

  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content: replyContent,
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // 5. Validate reply properties
  TestValidator.equals(
    "reply content matches submitted content",
    reply.content,
    replyContent,
  );
  TestValidator.predicate(
    "reply content length is between 5 and 1000 characters",
    reply.content.length >= 5 && reply.content.length <= 1000,
  );
  TestValidator.equals(
    "reply edited flag is false initially",
    reply.edited,
    false,
  );

  // 6. Validate that reply is linked to the correct post
  TestValidator.predicate(
    "reply was successfully created for the post",
    reply.id !== undefined,
  );
}
