import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Simulate a member creating a comment on an existing post within a community.
 *
 * Business Context:
 *
 * - Members can comment only if registered, verified, and taking action within an
 *   existing community and existing post.
 * - The test simulates the complete prerequisite workflow: registration,
 *   community creation, post creation, then comment creation (root comment).
 *
 * Steps:
 *
 * 1. Register a new member with a unique email and secure password.
 * 2. Use member's session (token auto-managed) to create a new community with
 *    unique name/title/slug/description.
 * 3. Create a post (content_type: "text") attached to that community, with a
 *    compliant title/body.
 * 4. Submit a root comment to the post (parent_id omitted/null).
 * 5. Validate the comment's presence, field-level correctness (text, user id, post
 *    id), parent linkage (none), nesting_level (should be 1), and status
 *    (should be "published" or platform-moderated default).
 */
export async function test_api_comment_creation_by_member_on_post(
  connection: api.IConnection,
) {
  // 1. Member registration
  const email = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Community creation
  const communityName = RandomGenerator.alphaNumeric(8).toLowerCase();
  const communitySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityBody = {
    name: communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    slug: communitySlug,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator linkage",
    community.creator_member_id,
    member.id,
  );

  // 3. Post creation
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }) satisfies string as string,
    content_body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 12,
    }),
    content_type: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community linkage",
    post.community_platform_community_id,
    community.id,
  );

  // 4. Root comment creation
  const commentBody = {
    community_platform_post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 2, wordMin: 6, wordMax: 15 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // Validation checks for business logic
  TestValidator.equals(
    "comment post linkage",
    comment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment member linkage",
    comment.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "comment body matches input",
    comment.body,
    commentBody.body,
  );
  TestValidator.equals("comment is root", comment.parent_id, undefined);
  TestValidator.equals("comment root nesting level", comment.nesting_level, 1);
  TestValidator.predicate(
    "comment status is published or platform default",
    typeof comment.status === "string" &&
      (comment.status === "published" || !!comment.status.length),
  );
}
