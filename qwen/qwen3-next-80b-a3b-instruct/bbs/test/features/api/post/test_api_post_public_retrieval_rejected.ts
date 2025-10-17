import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_post_public_retrieval_rejected(
  connection: api.IConnection,
) {
  // Step 1: Join as a new member to create a post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a topic (Inflation) for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 3: Create a draft post as the member
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Impact of inflation on consumer spending",
        content:
          "In recent months, inflation has risen sharply, affecting household budgets across the country. Consumers are cutting back on non-essential spending while prioritizing basic necessities. This trend is particularly noticeable in discretionary categories like dining out and entertainment.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Authenticate as admin to reject the post
  const adminEmail: string = typia.random<string>();
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin_password_456",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 5: Reject the post with a moderation reason
  const rejectedPost: IEconomicBoardPosts =
    await api.functional.admin.posts.reject(connection, {
      postId: post.id,
      body: {
        moderation_reason:
          "Post contains factual inaccuracies regarding macroeconomic trends",
      } satisfies IEconomicBoardPosts.IReject,
    });
  typia.assert(rejectedPost);

  // Step 6: Verify that the post is no longer accessible via public retrieval
  // The system should return HTTP 404 Not Found when attempting to retrieve rejected posts
  await TestValidator.error(
    "rejected post should be invisible to public users",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: post.id,
      });
    },
  );
}
