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

export async function test_api_post_update_by_admin_with_status_change(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create topic category
  const topicName: "Elections" = "Elections";
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: topicName,
        description: "Discussion topic for national elections",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create post by member with 'pending' status
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Election Issues in 2024",
        content: "The upcoming elections present critical economic challenges.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("post status is pending", post.status, "pending");

  // 4. Reject the post to 'rejected'
  const rejectReason = "Contains unsubstantiated claims";
  const rejectedPost: IEconomicBoardPosts =
    await api.functional.admin.posts.reject(connection, {
      postId: post.id,
      body: {
        moderation_reason: rejectReason,
      } satisfies IEconomicBoardPosts.IReject,
    });
  typia.assert(rejectedPost);
  TestValidator.equals(
    "post status is rejected",
    rejectedPost.status,
    "rejected",
  );
  TestValidator.equals("admin_id is set", rejectedPost.admin_id, null);
  TestValidator.equals(
    "moderation_reason is preserved",
    rejectedPost.moderation_reason,
    rejectReason,
  );

  // 5. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPass123",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 6. Update post content and subject (status remains 'rejected')
  const updatedPost: IEconomicBoardPost =
    await api.functional.economicBoard.admin.posts.update(connection, {
      postId: post.id,
      body: {
        subject: "Election Issues in 2024 (Updated)",
        content:
          "The upcoming elections present critical economic challenges. (Updated)",
      } satisfies IEconomicBoardPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Verify that content was updated and admin_id is set
  TestValidator.notEquals(
    "subject was updated",
    updatedPost.subject,
    post.subject,
  );
  TestValidator.notEquals(
    "content was updated",
    updatedPost.content,
    post.content,
  );
  TestValidator.notEquals("admin_id is now set", updatedPost.admin_id, null);
  TestValidator.equals(
    "moderation_reason is preserved",
    updatedPost.moderation_reason,
    rejectReason,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    post.created_at,
  );
  TestValidator.notEquals(
    "updated_at is updated",
    updatedPost.updated_at,
    post.updated_at,
  );
}
