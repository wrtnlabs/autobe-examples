import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_admin_post_hard_delete(
  connection: api.IConnection,
) {
  // 1. Create admin account
  const adminEmail = RandomGenerator.alphabets(8) + "@example.com";
  const adminPassword = "SecurePass123!";
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

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
  TestValidator.equals("topic name should match", topic.name, topicName);

  // 3. Create a post as a member
  const postSubject = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });
  const createdPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: postSubject,
        content: postContent,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(createdPost);
  TestValidator.equals(
    "post status should be pending",
    createdPost.status,
    "pending",
  );

  // 4. Hard delete the post as admin
  const deletionResponse: IEconomicBoardPosts.IDelete =
    await api.functional.admin.posts.erase(connection, {
      postId: createdPost.id,
    });
  typia.assert(deletionResponse);

  // 5. Verify that hard deletion is permanent by attempting to delete again
  // This should fail with 404 since the post no longer exists
  await TestValidator.error(
    "second deletion of same post should fail with 404",
    async () => {
      await api.functional.admin.posts.erase(connection, {
        postId: createdPost.id,
      });
    },
  );

  // 6. Verify that the topic still exists (test that topic deletion did not occur)
  const retrievedTopic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(retrievedTopic);
  TestValidator.notEquals(
    "should be a different topic instance",
    retrievedTopic.id,
    topic.id,
  );
}
