import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_delete_nonexistent(
  connection: api.IConnection,
) {
  // Authenticate admin to perform deletion
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: RandomGenerator.alphabets(8) + "@example.com",
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Create a topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Create a post to provide valid parent context for reply deletion
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Attempt to delete a non-existent reply
  await TestValidator.error(
    "delete non-existent reply should return 404 Not Found",
    async () => {
      await api.functional.economicBoard.admin.posts.replies.erase(connection, {
        postId: post.id,
        replyId: typia.random<string & tags.Format<"uuid">>(), // Random UUID that doesn't exist
      });
    },
  );
}
