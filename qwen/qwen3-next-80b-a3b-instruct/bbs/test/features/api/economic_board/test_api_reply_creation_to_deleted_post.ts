import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_creation_to_deleted_post(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a member to create posts and replies
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a valid topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Elections",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a post under the created topic
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Election policy comparison",
        content:
          "This is a detailed analysis of the upcoming election policies.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Permanently delete the post as an admin action
  await api.functional.economicBoard.admin.posts.erase(connection, {
    postId: post.id,
  });

  // Step 5: Attempt to create a reply to the deleted post
  // This should fail with 404 Not Found (soft deletion is not supported)
  await TestValidator.error(
    "reply creation to deleted post should fail with 404",
    async () => {
      await api.functional.economicBoard.member.posts.replies.create(
        connection,
        {
          postId: post.id,
          body: {
            content: "This reply should not be allowed on a deleted post.",
          } satisfies IEconomicBoardReply.ICreate,
        },
      );
    },
  );
}
