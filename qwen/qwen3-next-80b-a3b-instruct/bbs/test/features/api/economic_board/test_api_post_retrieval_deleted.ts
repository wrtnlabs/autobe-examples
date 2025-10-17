import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_retrieval_deleted(
  connection: api.IConnection,
) {
  // 1. Authenticate a member to create test data
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash:
          "$2a$10$K4dU5bL7fC1wJ2q8xQ9vZ0nR3pM6oN8yU7WfF2GvT3rC5hJ6gK9sX6", // Realistic bcrypt hash format
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a post with 'pending' status
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
    "post created with pending status",
    post.status,
    "pending",
  );

  // 4. Permanently delete the post via admin API (hard delete)
  await api.functional.economicBoard.admin.posts.erase(connection, {
    postId: post.id,
  });

  // 5. Attempt to retrieve the deleted post - should return 404 Not Found
  await TestValidator.error(
    "retrieving deleted post should fail with 404",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: post.id,
      });
    },
  );
}
