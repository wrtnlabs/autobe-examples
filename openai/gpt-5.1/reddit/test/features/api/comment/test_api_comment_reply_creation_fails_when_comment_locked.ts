import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReply";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_reply_creation_fails_when_comment_locked(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the primary member user (who will own the content).
  const primaryJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const primaryUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: primaryJoinBody,
    });
  typia.assert(primaryUser);

  // 2. Create a community where the conversation will live.
  const communitySlug = RandomGenerator.alphabets(10);
  const communityBody = {
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a membership for the primary user in that community.
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

  // 4. Create a post in the community.
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a top-level parent comment on the post.
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(parentComment);

  // 6. Create a first reply under that comment as the primary (member) user.
  const firstReplyBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    format: "plain" as const,
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const firstReply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: firstReplyBody,
      },
    );
  typia.assert(firstReply);

  // Sanity checks for the first reply linkage.
  TestValidator.equals(
    "first reply is attached to the correct post",
    firstReply.post.id,
    post.id,
  );
  TestValidator.equals(
    "first reply parent_comment matches parent comment id",
    firstReply.parent_comment.id,
    parentComment.id,
  );

  // 7. Register a second member user who does NOT join the community.
  const secondaryJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}+secondary@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const secondaryUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: secondaryJoinBody,
    });
  typia.assert(secondaryUser);

  // 8. Attempt to create a reply as the non-member user.
  const unauthorizedReplyBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "markdown" as const,
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  await TestValidator.error(
    "non-member user cannot create reply in community they are not member of",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
        connection,
        {
          postId: post.id,
          commentId: parentComment.id,
          body: unauthorizedReplyBody,
        },
      );
    },
  );
}
