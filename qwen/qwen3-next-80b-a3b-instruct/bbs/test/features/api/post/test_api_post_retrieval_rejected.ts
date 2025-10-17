import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_retrieval_rejected(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create the rejected post
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "secureAdminPassword123";

  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a topic to associate with the post
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a pending post
  const subject: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const content: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 8,
  });

  const createdPost: IEconomicBoardPost =
    await api.functional.economicBoard.admin.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: subject,
        content: content,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(createdPost);
  TestValidator.equals(
    "post status should be pending",
    createdPost.status,
    "pending",
  );

  // Step 4: Reject the post to transition status to 'rejected'
  const rejectionReason: string = "Contains inappropriate economic claims";

  const rejectedPost: IEconomicBoardPosts =
    await api.functional.admin.posts.reject(connection, {
      postId: createdPost.id,
      body: {
        moderation_reason: rejectionReason,
      } satisfies IEconomicBoardPosts.IReject,
    });
  typia.assert(rejectedPost);
  TestValidator.equals(
    "post status should be rejected",
    rejectedPost.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason should match",
    rejectedPost.moderation_reason,
    rejectionReason,
  );

  // Step 5: Attempt to retrieve the rejected post
  // This should return 404 Not Found (handled as error by SDK)
  await TestValidator.error(
    "rejected post should not be retrievable",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: createdPost.id,
      });
    },
  );
}
