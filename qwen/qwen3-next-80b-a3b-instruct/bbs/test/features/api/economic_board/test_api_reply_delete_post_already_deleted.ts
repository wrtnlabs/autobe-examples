import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_delete_post_already_deleted(
  connection: api.IConnection,
) {
  // Step 1: Authenticate and create a member account to submit a reply
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Authenticate and create an admin account to perform deletion
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin_password_456",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 3: Create an active topic for the post to be associated with
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
        description: "Discussion about inflation rates and economic policies",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 4: Create a published post to which the reply will be added
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Analysis of recent inflation trends",
        content:
          "The recent data shows a significant increase in inflation rates across major economies. This trend currently aligns with monetary policy objectives, though it's causing concern among consumers.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create a reply to the post under the member's session
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content:
          "I agree with this analysis. The central bank's recent actions are likely contributing to this trend.",
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // Step 6: Permanently delete the parent post before attempting to delete the reply
  await api.functional.economicBoard.admin.posts.erase(connection, {
    postId: post.id,
  });

  // Step 7: Try deleting the reply associated with the deleted post
  await TestValidator.error(
    "cannot delete reply when parent post is already deleted",
    async () => {
      await api.functional.economicBoard.admin.posts.replies.erase(connection, {
        postId: post.id,
        replyId: reply.id,
      });
    },
  );
}
