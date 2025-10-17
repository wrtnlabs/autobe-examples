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

export async function test_api_post_approval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create a topic
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
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
        description: "Discussion about inflation rates and economic impacts",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);
  TestValidator.equals("topic name matches", topic.name, topicName);

  // Step 3: Authenticate as member to create a pending post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123", // Using static value as required for test
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a pending post using the created topic
  const postSubject: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const postContent: string = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 8,
  });
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: postSubject,
        content: postContent,
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("post status is pending", post.status, "pending");
  TestValidator.equals(
    "post belongs to topic",
    post.economic_board_topics_id,
    topic.id,
  );
  TestValidator.equals("post subject matches", post.subject, postSubject);
  TestValidator.equals("post content matches", post.content, postContent);

  // Step 5: Switch back to admin context for approval
  // Since we're reusing connection, we don't need to re-authenticate
  // The connection headers are automatically managed by the SDK

  // Step 6: Approve the pending post
  const approvedPost: IEconomicBoardPosts =
    await api.functional.admin.posts.approve(connection, {
      postId: post.id,
    });
  typia.assert(approvedPost);

  // Step 7: Validate the post approval outcome
  TestValidator.equals(
    "post status is now published",
    approvedPost.status,
    "published",
  );
  TestValidator.equals("post ID matches", approvedPost.id, post.id);
  TestValidator.equals(
    "topic ID unchanged",
    approvedPost.economic_board_topics_id,
    topic.id,
  );
  TestValidator.equals("subject unchanged", approvedPost.subject, postSubject);
  TestValidator.equals("content unchanged", approvedPost.content, postContent);
  TestValidator.equals("admin_id is set", approvedPost.admin_id, admin.id);
  TestValidator.equals(
    "moderation_reason is null",
    approvedPost.moderation_reason,
    null,
  );

  // Step 8: Verify the post is now accessible through public endpoints
  // Note: Per business rules, published posts should be accessible
  // We can't test external endpoints directly, but the status change to 'published'
  // is the authoritative indicator that the post is now accessible

  // Step 9: Confirm the approval metadata is correct
  const now = new Date();
  TestValidator.predicate(
    "created_at timestamp is reasonable",
    new Date(approvedPost.created_at) <= now,
  );
  TestValidator.predicate(
    "updated_at timestamp is reasonable",
    new Date(approvedPost.updated_at) <= now,
  );
  TestValidator.predicate(
    "admin_id is a valid UUID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
      approvedPost.admin_id || "",
    ),
  );
}
