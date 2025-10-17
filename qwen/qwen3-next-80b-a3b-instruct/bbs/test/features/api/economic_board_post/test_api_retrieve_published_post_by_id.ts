import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_retrieve_published_post_by_id(
  connection: api.IConnection,
) {
  // 1. Authenticate member to create a post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for the post
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
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a published post
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);
  // Ensure post status is 'published' - system should auto-publish in test context
  TestValidator.equals(
    "post status should be published",
    post.status,
    "published",
  );

  // 4. Retrieve the published post by ID
  const retrievedPost: IEconomicBoardPost =
    await api.functional.economicBoard.posts.at(connection, {
      postId: post.id,
    });
  typia.assert(retrievedPost);

  // 5. Validate retrieved post matches expected data
  TestValidator.equals("post ID matches", retrievedPost.id, post.id);
  TestValidator.equals(
    "topic ID matches",
    retrievedPost.economic_board_topics_id,
    post.economic_board_topics_id,
  );
  TestValidator.equals("subject matches", retrievedPost.subject, post.subject);
  TestValidator.equals("content matches", retrievedPost.content, post.content);
  TestValidator.equals("status matches", retrievedPost.status, "published");
  TestValidator.equals(
    "reply count matches",
    retrievedPost.reply_count,
    post.reply_count,
  );
  TestValidator.equals(
    "edited flag matches",
    retrievedPost.edited,
    post.edited,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedPost.created_at,
    post.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedPost.updated_at,
    post.updated_at,
  );
  // author_hash should be null for authenticated members
  TestValidator.equals(
    "author_hash should be null for authenticated members",
    retrievedPost.author_hash,
    null,
  );
  // admin_id should be absent or null for auto-published posts
  TestValidator.equals(
    "admin_id should be null for auto-published posts",
    retrievedPost.admin_id,
    null,
  );
  TestValidator.equals(
    "moderation_reason should be null for published posts",
    retrievedPost.moderation_reason,
    null,
  );
}
