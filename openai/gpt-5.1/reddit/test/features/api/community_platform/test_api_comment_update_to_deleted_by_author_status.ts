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

export async function test_api_comment_update_to_deleted_by_author_status(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user (author of post and comment)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const author: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(author);

  // 2. Create a community owned by this member user
  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug matches requested slug",
    community.slug,
    communitySlug,
  );

  // 3. Create a membership for this user in the community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community slug matches community.slug",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member id matches author id",
    membership.memberUser.id,
    author.id,
  );

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post.community_id matches community.id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post.author_memberuser_id matches author.id",
    post.author_memberuser_id,
    author.id,
  );

  // 5. Create a visible top-level comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const originalComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(originalComment);

  TestValidator.equals(
    "comment.post.id summary matches post.id",
    originalComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author id matches member user id",
    originalComment.author.id,
    author.id,
  );
  TestValidator.notEquals(
    "initial comment status is not already deleted_by_author",
    originalComment.status,
    "deleted_by_author",
  );

  const originalUpdatedAt = originalComment.updated_at;
  const originalDeletedAt = originalComment.deleted_at ?? null;

  // 6. Update the comment to soft-delete it with status=deleted_by_author
  const deletedBodyPlaceholder = "[deleted]";
  const commentUpdateBody = {
    body: deletedBodyPlaceholder,
    status: "deleted_by_author",
    is_locked: undefined,
  } satisfies ICommunityPlatformComment.IUpdate;

  const updatedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: commentUpdateBody,
      },
    );
  typia.assert(updatedComment);

  // 7. Validate invariants and lifecycle transitions
  TestValidator.equals(
    "updated comment id is unchanged",
    updatedComment.id,
    originalComment.id,
  );
  TestValidator.equals(
    "updated comment post id remains the same",
    updatedComment.post.id,
    originalComment.post.id,
  );
  TestValidator.equals(
    "updated comment author id remains the same",
    updatedComment.author.id,
    originalComment.author.id,
  );

  TestValidator.equals(
    "comment status updated to deleted_by_author",
    updatedComment.status,
    "deleted_by_author",
  );
  TestValidator.equals(
    "comment body replaced with placeholder",
    updatedComment.body,
    deletedBodyPlaceholder,
  );

  TestValidator.predicate(
    "updated_at is advanced after soft delete",
    updatedComment.updated_at > originalUpdatedAt,
  );

  if (originalDeletedAt === null) {
    TestValidator.predicate(
      "deleted_at is populated after soft delete when previously null",
      updatedComment.deleted_at !== null &&
        updatedComment.deleted_at !== undefined,
    );
  } else {
    TestValidator.predicate(
      "deleted_at remains non-null after subsequent soft delete update",
      updatedComment.deleted_at !== null &&
        updatedComment.deleted_at !== undefined,
    );
  }
}
