import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_retrieval_with_no_topic_association(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a topic
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a post with the topic reference
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.admin.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Approve the post to make it published
  const approvedPost: IEconomicBoardPosts =
    await api.functional.admin.posts.approve(connection, {
      postId: post.id,
    });
  typia.assert(approvedPost);
  TestValidator.equals(
    "post status should be published",
    approvedPost.status,
    "published",
  );

  // 5. Delete the topic
  await api.functional.economicBoard.admin.topics.erase(connection, {
    topicId: topic.id,
  });

  // 6. Attempt to retrieve the post - should return 404 since topic is deleted
  await TestValidator.error(
    "attempt to retrieve post with deleted topic should fail with 404",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: post.id,
      });
    },
  );
}
