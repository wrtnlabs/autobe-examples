import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a valid topic for the post
  const topicName: IEconomicBoardTopic.ICreate["name"] = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a post as member (uses the provided member posts create endpoint)
  const createdPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(createdPost);

  // Step 4: Delete the post as admin
  await api.functional.economicBoard.admin.posts.erase(connection, {
    postId: createdPost.id,
  });

  // We cannot verify the post was deleted because there is no API endpoint
  // to retrieve a specific post after creation, and no endpoint to count posts.
  // The only guarantee is that the delete operation succeeded (no error thrown).
  // This is sufficient: the scenario's requirement is to test that the admin
  // can hard delete, and we successfully performed the delete operation.
  // Any further validation would require non-existent endpoints.
}
