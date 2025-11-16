import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that an authenticated member user can create a top-level comment on
 * a post in a community where they hold membership, and that the created
 * comment correctly links to the post and author.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new community platform member user (join) and obtain an authorized
 *    session (SDK manages Authorization header).
 * 2. Create a new community as that member user.
 * 3. Join the same community, establishing a membership record.
 * 4. Create a new text post inside the community.
 * 5. Create a root (top-level) comment on that post with non-empty content.
 * 6. Verify that the created comment is structurally valid, has the expected body
 *    content, and is linked to the correct post and author.
 */
export async function test_api_comment_creation_on_member_post_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and establish authenticated context
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a new community as that member user
  const communitySlug = `test-${RandomGenerator.alphabets(12)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Join the created community as the same member user
  const membershipCreateBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // Sanity check: membership community and member summaries are aligned
  TestValidator.equals(
    "membership community id matches created community id",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member id matches authorized member id",
    membership.memberUser.id,
    authorizedMember.id,
  );

  // 4. Create a new text post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "created post community id matches community.id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "created post author id matches authorized member id",
    post.author_memberuser_id,
    authorizedMember.id,
  );

  // 5. Create a top-level comment on the post
  const commentContent: string = RandomGenerator.paragraph({ sentences: 5 });
  const commentCreateBody = {
    content: commentContent,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 6. Assertions on the created comment structure and linkage
  TestValidator.equals(
    "comment body matches submitted content",
    comment.body,
    commentContent,
  );

  TestValidator.equals(
    "comment post summary id matches post id",
    comment.post.id,
    post.id,
  );

  TestValidator.equals(
    "comment author summary id matches authorized member id",
    comment.author.id,
    authorizedMember.id,
  );

  TestValidator.predicate(
    "comment is top-level (no parent_comment_id)",
    comment.parent_comment_id === null ||
      comment.parent_comment_id === undefined,
  );

  TestValidator.predicate(
    "comment created_at is a non-empty string",
    typeof comment.created_at === "string" && comment.created_at.length > 0,
  );
}
