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

export async function test_api_comment_detail_respects_moderation_visibility(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community
  const communitySlug: string = RandomGenerator.alphabets(12);
  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "created community slug should match request",
    community.slug,
    communitySlug,
  );

  // 3. Create a membership for the member user in the community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  TestValidator.equals(
    "membership community slug should match created community",
    membership.community.slug,
    community.slug,
  );

  // 4. Create a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBodyText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: postTitle,
    body: postBodyText,
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post should belong to created community",
    post.community_id,
    community.id,
  );

  // 5. Create a root-level comment on the post
  const commentContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 9,
  });

  const commentCreateBody = {
    content: commentContent,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(createdComment);

  TestValidator.equals(
    "created comment should reference the same post",
    createdComment.post.id,
    post.id,
  );

  TestValidator.equals(
    "created comment body should match submitted content",
    createdComment.body,
    commentContent,
  );

  TestValidator.predicate(
    "root-level comment should not have a parent_comment_id",
    createdComment.parent_comment_id === null ||
      createdComment.parent_comment_id === undefined,
  );

  // Capture baseline moderation-related fields
  const baselineStatus: string = createdComment.status;
  const baselineIsLocked: boolean = createdComment.is_locked;

  // 6. Call the public comment detail endpoint
  const detailedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: createdComment.id,
    });
  typia.assert<ICommunityPlatformComment>(detailedComment);

  // 7. Validate that detail endpoint preserves linkage, content, and moderation metadata
  TestValidator.equals(
    "detail comment id should match created comment id",
    detailedComment.id,
    createdComment.id,
  );

  TestValidator.equals(
    "detail comment should reference the same post as created comment",
    detailedComment.post.id,
    post.id,
  );

  TestValidator.equals(
    "detail comment parent_comment_id should equal created comment parent_comment_id",
    detailedComment.parent_comment_id,
    createdComment.parent_comment_id ?? null,
  );

  TestValidator.equals(
    "detail comment body should match created comment body (non-moderated baseline)",
    detailedComment.body,
    createdComment.body,
  );

  TestValidator.equals(
    "detail comment status should remain consistent with created comment",
    detailedComment.status,
    baselineStatus,
  );

  TestValidator.equals(
    "detail comment is_locked should remain consistent with created comment",
    detailedComment.is_locked,
    baselineIsLocked,
  );
}
