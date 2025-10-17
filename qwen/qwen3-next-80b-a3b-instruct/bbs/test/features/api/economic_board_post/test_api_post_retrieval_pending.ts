import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_retrieval_pending(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish admin privileges
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a post in 'pending' status
  const pendingPost: IEconomicBoardPost =
    await api.functional.economicBoard.admin.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(pendingPost);

  // Step 4: Attempt to retrieve the pending post using the public endpoint
  // This should fail with a 404 Not Found error since only 'published' posts are visible
  await TestValidator.httpError(
    "pending post should not be retrievable",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: pendingPost.id,
      });
    },
  );
}
