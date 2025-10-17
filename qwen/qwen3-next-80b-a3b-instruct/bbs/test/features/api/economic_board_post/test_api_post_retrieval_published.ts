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
  // Step 1: Authenticate as member to create test data
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: typia.random<string>(),
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic for the post
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

  // Step 3: Create a published economic post
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals(
    "post status should be published",
    post.status,
    "published",
  );

  // Step 4: Retrieve the published post
  const retrievedPost: IEconomicBoardPost =
    await api.functional.economicBoard.posts.at(connection, {
      postId: post.id,
    });
  typia.assert(retrievedPost);

  // Validate all returned fields of the published post
  TestValidator.equals(
    "retrieved post ID matches created post",
    retrievedPost.id,
    post.id,
  );
  TestValidator.equals(
    "retrieved post topic ID matches",
    retrievedPost.economic_board_topics_id,
    topic.id,
  );
  TestValidator.equals(
    "retrieved post subject matches",
    retrievedPost.subject,
    post.subject,
  );
  TestValidator.equals(
    "retrieved post content matches",
    retrievedPost.content,
    post.content,
  );
  TestValidator.equals(
    "retrieved post status is published",
    retrievedPost.status,
    "published",
  );
  TestValidator.equals(
    "retrieved post reply count is 0",
    retrievedPost.reply_count,
    0,
  );
  TestValidator.equals(
    "retrieved post edited flag is false",
    retrievedPost.edited,
    false,
  );
  TestValidator.predicate(
    "retrieved post created_at is valid date-time",
    () => {
      return !isNaN(new Date(retrievedPost.created_at).getTime());
    },
  );
  TestValidator.predicate(
    "retrieved post updated_at is valid date-time",
    () => {
      return !isNaN(new Date(retrievedPost.updated_at).getTime());
    },
  );
  TestValidator.equals(
    "retrieved post author_hash is null for member",
    retrievedPost.author_hash,
    null,
  );
  TestValidator.equals(
    "retrieved post admin_id is null (no moderation yet)",
    retrievedPost.admin_id,
    null,
  );
  TestValidator.equals(
    "retrieved post moderation_reason is null",
    retrievedPost.moderation_reason,
    null,
  );

  // Step 5: Verify that unpublished posts return 404
  await TestValidator.error("should not retrieve pending post", async () => {
    // Create a post (it will be in 'pending' status according to the system)
    const pendingPost: IEconomicBoardPost =
      await api.functional.economicBoard.member.posts.create(connection, {
        body: {
          economic_board_topics_id: topic.id,
          subject: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEconomicBoardPost.ICreate,
      });
    typia.assert(pendingPost);
    TestValidator.equals(
      "pending post status is pending",
      pendingPost.status,
      "pending",
    );

    // Attempt to retrieve it - should fail with 404
    await api.functional.economicBoard.posts.at(connection, {
      postId: pendingPost.id,
    });
  });

  // NOTE: The 'deleted' status scenario cannot be implemented because there is no
  // API endpoint provided to change a post status to 'deleted'. This is an
  // unimplementable scenario per the given API functions, so it is omitted.
  // We have tested the only implementable scenario: prohibitive access to non-published posts.
}
