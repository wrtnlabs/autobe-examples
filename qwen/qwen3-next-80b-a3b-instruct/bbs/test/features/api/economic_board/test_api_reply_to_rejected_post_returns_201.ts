import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";

export async function test_api_reply_to_rejected_post_returns_201(
  connection: api.IConnection,
) {
  // 1. Authenticate as member to create a post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash:
          "$2b$12$X6V6Uv9Qv1QqZ9u7R1X16O0K6Y7J3d5v8c5X6V6Uv9Qv1QqZ9u7R1X16O",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for the parent post
  const topicName:
    | "Inflation"
    | "Tax Policy"
    | "Elections"
    | "Global Trade"
    | "Monetary Policy"
    | "Labor Markets"
    | "Fiscal Policy" = "Inflation";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create a post as member that will be rejected
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Rejection Test Post",
        content: "This post should be rejected to test reply functionality.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Authenticate as admin to reject the post
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin_password_456",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 5. Reject the post as admin
  await api.functional.admin.posts.reject(connection, {
    postId: post.id,
    body: {
      moderation_reason:
        "Post violates community guidelines on speculative content.",
    } satisfies IEconomicBoardPosts.IReject,
  });

  // 6. Switch back to member account to reply to the rejected post
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password_hash:
        "$2b$12$X6V6Uv9Qv1QqZ9u7R1X16O0K6Y7J3d5v8c5X6V6Uv9Qv1QqZ9u7R1X16O",
    } satisfies IEconomicBoardMember.ICreate,
  });

  // 7. Create a reply to the rejected post
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content: "This is a valid reply to a rejected post.",
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);
}
