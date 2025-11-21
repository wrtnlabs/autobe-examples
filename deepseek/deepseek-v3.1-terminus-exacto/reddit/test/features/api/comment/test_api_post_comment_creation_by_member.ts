import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test the complete workflow of a member creating a comment on an existing
 * post.
 *
 * This E2E test validates that authenticated members can successfully add
 * comments to posts they have access to, including proper post association,
 * comment content validation, and response structure verification. The test
 * ensures that the comment is properly linked to the post, maintains
 * referential integrity, and returns the complete comment object with
 * system-generated fields populated.
 */
export async function test_api_post_comment_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12); // Generate secure password

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post as prerequisite for comment creation
  // Note: We need to use a valid community ID that exists in the system
  // Since we don't have a community creation API, we'll assume a valid community exists
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create a comment on the post
  const commentContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });

  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: commentContent,
          community_platform_post_id: post.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Validate comment creation response
  TestValidator.equals(
    "comment body matches input",
    comment.body,
    commentContent,
  );
  TestValidator.equals(
    "comment is linked to correct post",
    comment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals("post reference matches", comment.post.id, post.id);
  TestValidator.predicate(
    "comment has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.id,
    ),
  );
  TestValidator.predicate(
    "comment has creation timestamp",
    comment.created_at !== undefined && comment.created_at !== null,
  );
  TestValidator.predicate(
    "comment has update timestamp",
    comment.updated_at !== undefined && comment.updated_at !== null,
  );
  TestValidator.equals("comment has initial score of 0", comment.score ?? 0, 0);
  TestValidator.equals(
    "comment has initial reply count of 0",
    comment.reply_count,
    0,
  );
  TestValidator.equals(
    "comment status is published",
    comment.status,
    "published",
  );

  // Step 5: Validate referential integrity
  TestValidator.equals(
    "comment post ID matches created post ID",
    comment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "nested post object ID matches",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "nested post title matches",
    comment.post.title,
    post.title,
  );

  // Step 6: Test error scenario - comment on non-existent post
  await TestValidator.error(
    "comment creation should fail for non-existent post",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            body: "Test comment content",
            community_platform_post_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
