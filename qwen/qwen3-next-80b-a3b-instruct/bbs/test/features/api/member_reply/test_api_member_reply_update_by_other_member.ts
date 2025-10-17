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

export async function test_api_member_reply_update_by_other_member(
  connection: api.IConnection,
) {
  // Create first member account (reply owner)
  const firstMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const firstMember: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Create admin account for moderation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin_password_456",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Create topic "Tax Policy" for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Tax Policy",
        description: "Discussion on tax legislation and policy.",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Create post as first member
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "New Tax Reform Proposal",
        content:
          "The proposed tax reform aims to simplify the current system by reducing brackets and increasing standard deduction.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);

  // Approve post as admin
  await api.functional.admin.posts.approve(connection, {
    postId: post.id,
  });

  // Create reply as first member
  const reply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: post.id,
      body: {
        content:
          "I agree with this proposal. Simplifying the tax code would benefit small businesses.",
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(reply);

  // Switch context to second member (non-owner)
  const secondMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const secondMember: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        password_hash: "hashed_password_789",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Attempt to update reply as second member (non-owner)
  await TestValidator.error(
    "non-owner cannot update other member's reply",
    async () => {
      await api.functional.economicBoard.member.posts.replies.update(
        connection,
        {
          postId: post.id,
          replyId: reply.id,
          body: {
            content: "This is a malicious update attempt by unauthorized user.",
          } satisfies IEconomicBoardReply.IUpdate,
        },
      );
    },
  );
}
