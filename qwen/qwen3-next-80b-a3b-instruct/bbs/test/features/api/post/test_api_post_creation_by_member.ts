import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash:
          "bcrypt_hashed_value_123456789012345678901234567890123456789012345678901234567890",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic for the post - randomly choose from allowed topic names
  const allowedTopicNames = [
    "Inflation",
    "Tax Policy",
    "Elections",
    "Global Trade",
    "Monetary Policy",
    "Labor Markets",
    "Fiscal Policy",
  ] as const;
  const topicName = RandomGenerator.pick(allowedTopicNames);
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);
  TestValidator.equals("topic name matches", topic.name, topicName);

  // Step 3: Create a post with subject and content meeting length requirements
  const subject: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const content: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 3,
    wordMax: 10,
  });

  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject,
        content,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Validate post response
  TestValidator.equals("post status is pending", post.status, "pending");
  TestValidator.equals(
    "topic ID matches",
    post.economic_board_topics_id,
    topic.id,
  );
  TestValidator.equals("subject matches", post.subject, subject);
  TestValidator.equals("content matches", post.content, content);
  TestValidator.predicate(
    "author_hash is generated",
    post.author_hash !== null,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    post.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    post.updated_at.length > 0,
  );
  TestValidator.equals("reply_count is 0", post.reply_count, 0);
  TestValidator.equals("edited is false", post.edited, false);
  TestValidator.equals("edited_at is null", post.edited_at, null);
  TestValidator.equals("admin_id is null", post.admin_id, null);
  TestValidator.equals(
    "moderation_reason is null",
    post.moderation_reason,
    null,
  );
}
