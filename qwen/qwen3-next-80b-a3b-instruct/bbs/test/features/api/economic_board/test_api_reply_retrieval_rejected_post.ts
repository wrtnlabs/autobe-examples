import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReplies";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_retrieval_rejected_post(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to gain moderation privileges
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SafePassword123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a valid economic topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a post by a member (will be rejected later)
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Impact of inflation on savings",
        content:
          "Recent inflation rates have significantly impacted household savings across the country. I'm interested in understanding how different economic policies might mitigate these effects.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a reply to the post before rejection
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content:
          "Central bank interest rate hikes could help control inflation but may also slow economic growth.",
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // Step 5: Reject the parent post using admin privileges
  const rejectedPost: IEconomicBoardPosts =
    await api.functional.admin.posts.reject(connection, {
      postId: post.id,
      body: {
        moderation_reason:
          "Contains speculative economic analysis without data sources.",
      } satisfies IEconomicBoardPosts.IReject,
    });
  typia.assert(rejectedPost);
  TestValidator.equals(
    "post status should be rejected",
    rejectedPost.status,
    "rejected",
  );

  // Step 6: Attempt to retrieve the reply for the rejected post - should fail with 404
  await TestValidator.error(
    "retrieving reply for rejected post should fail with 404",
    async () => {
      await api.functional.economicBoard.posts.replies.at(connection, {
        postId: post.id,
        replyId: reply.id,
      });
    },
  );
}
