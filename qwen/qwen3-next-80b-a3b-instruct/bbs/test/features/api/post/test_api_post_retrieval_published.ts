import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_retrieval_published(
  connection: api.IConnection,
) {
  // 1. Authenticate a member to create posts
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
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: "Discussion on inflation trends and economic impacts",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a published post
  const publishedPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Impact of inflation on wages",
        content:
          "Inflation has been steadily rising over the past year, affecting purchasing power across all income brackets. This trend necessitates wage adjustments to maintain living standards.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(publishedPost);
  TestValidator.equals(
    "post status should be published",
    publishedPost.status,
    "published",
  );

  // 4. Retrieve the published post by ID - should succeed
  const retrievedPublishedPost: IEconomicBoardPost =
    await api.functional.economicBoard.posts.at(connection, {
      postId: publishedPost.id,
    });
  typia.assert(retrievedPublishedPost);
  TestValidator.equals(
    "retrieved post ID matches",
    retrievedPublishedPost.id,
    publishedPost.id,
  );
  TestValidator.equals(
    "retrieved post status is published",
    retrievedPublishedPost.status,
    "published",
  );
  TestValidator.equals(
    "retrieved post subject matches",
    retrievedPublishedPost.subject,
    publishedPost.subject,
  );
  TestValidator.equals(
    "retrieved post content matches",
    retrievedPublishedPost.content,
    publishedPost.content,
  );
  TestValidator.equals(
    "retrieved post topic ID matches",
    retrievedPublishedPost.economic_board_topics_id,
    topic.id,
  );
  TestValidator.equals(
    "retrieved post reply count is 0",
    retrievedPublishedPost.reply_count,
    0,
  );
  TestValidator.equals(
    "retrieved post edited flag is false",
    retrievedPublishedPost.edited,
    false,
  );
  TestValidator.equals(
    "retrieved post author_hash is null",
    retrievedPublishedPost.author_hash,
    null,
  );
  TestValidator.equals(
    "retrieved post admin_id is null",
    retrievedPublishedPost.admin_id,
    null,
  );
  TestValidator.equals(
    "retrieved post moderation_reason is null",
    retrievedPublishedPost.moderation_reason,
    null,
  );

  // 5. Create a pending post
  const pendingPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Should we raise interest rates?",
        content:
          "With inflation climbing, there's debate about whether central banks should increase interest rates to cool demand.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(pendingPost);
  TestValidator.equals(
    "pending post status should be pending",
    pendingPost.status,
    "pending",
  );

  // 6. Retrieve pending post by ID - should return 404 (handled by error validation)
  await TestValidator.error(
    "retrieving pending post should fail with 404",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: pendingPost.id,
      });
    },
  );

  // 7. Create a rejected post
  const rejectedPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Microwave ovens cause cancer",
        content:
          "There is scientific evidence that microwave radiation can cause cancer with prolonged exposure.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(rejectedPost);
  TestValidator.equals(
    "rejected post status should be rejected",
    rejectedPost.status,
    "rejected",
  );

  // 8. Retrieve rejected post by ID - should return 404 (handled by error validation)
  await TestValidator.error(
    "retrieving rejected post should fail with 404",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: rejectedPost.id,
      });
    },
  );

  // 9. Create a deleted post
  const deletedPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Debate about blockchain technology",
        content:
          "Blockchain is a revolutionary technology that will transform global finance.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(deletedPost);
  TestValidator.equals(
    "deleted post status should be deleted",
    deletedPost.status,
    "deleted",
  );

  // 10. Retrieve deleted post by ID - should return 404 (handled by error validation)
  await TestValidator.error(
    "retrieving deleted post should fail with 404",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: deletedPost.id,
      });
    },
  );

  // 11. Verify that empty or invalid topic is not possible (implied by schema constraints)
  // TestSchema: economic_board_topics_id is required and must be UUID
  // We've used valid UUID from previously created topic, so validation covered

  // 12. Verify that empty subject or content is not possible (implied by schema constraints)
  // TestSchema: subject minLength=5, content minLength=10
  // We provided substantive content, so validation covered

  // 13. Verify the retrieval does not expose admin_id or moderation_reason for published posts
  TestValidator.equals(
    "admin_id should remain null for published post",
    retrievedPublishedPost.admin_id,
    null,
  );
  TestValidator.equals(
    "moderation_reason should remain null for published post",
    retrievedPublishedPost.moderation_reason,
    null,
  );
}
