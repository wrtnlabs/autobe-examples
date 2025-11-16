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

/**
 * Verify that retrieving a reply on a comment in a private community enforces
 * authorization rules.
 *
 * Business intent:
 *
 * - Replies under posts in private communities must not be visible to
 *   unauthenticated users or non-member users.
 * - Legitimate community members (including the community owner) must be able to
 *   retrieve such replies successfully.
 *
 * Scenario steps:
 *
 * 1. Register Member A via /auth/memberUser/join (owner and member).
 * 2. As Member A, create a community with private-like visibility using
 *    /communityPlatform/memberUser/communities.
 * 3. As Member A, join that community using
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. As Member A, create a post in that community via
 *    /communityPlatform/memberUser/posts.
 * 5. As Member A, create a parent comment under the post via
 *    /communityPlatform/memberUser/posts/{postId}/comments.
 * 6. As Member A, create a reply under that parent comment via
 *    /communityPlatform/memberUser/posts/{postId}/comments/{commentId}/replies.
 * 7. Using an unauthenticated connection (no Authorization header), call GET
 *    /communityPlatform/posts/{postId}/comments/{commentId}/replies/{replyId}
 *    and assert that it fails via TestValidator.error.
 * 8. Create Member B on a separate connection via /auth/memberUser/join, without
 *    joining the private community.
 * 9. As Member B, attempt the same GET on the reply and assert denial via
 *    TestValidator.error.
 * 10. Finally, as Member A (original connection), call the GET endpoint and assert
 *     success, verifying that the returned comment represents the reply and has
 *     consistent relationships (post, parent comment, author).
 */
export async function test_api_comment_reply_retrieval_for_private_community_requires_authorization(
  connection: api.IConnection,
) {
  // 1. Register Member A and establish authenticated connection (connectionA)
  const connectionA: api.IConnection = { ...connection };
  const memberAJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connectionA, {
      body: memberAJoinInput,
    });
  typia.assert(memberA);

  // 2. Create a private community as Member A
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "private",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connectionA,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community owner should be member A",
    community.owner_memberuser_id,
    memberA.id,
  );

  // 3. Establish membership for Member A in this private community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connectionA,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community should match created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member should be member A",
    membership.memberUser.id,
    memberA.id,
  );

  // 4. Create a post in the private community as Member A
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(
      connectionA,
      { body: postCreateBody },
    );
  typia.assert(post);

  TestValidator.equals(
    "post community id should match",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author should be member A",
    post.author_memberuser_id,
    memberA.id,
  );

  // 5. Create a parent comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connectionA,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(parentComment);

  TestValidator.equals(
    "parent comment post id should match",
    parentComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent comment author should be member A",
    parentComment.author.id,
    memberA.id,
  );

  // 6. Create a reply to that parent comment
  const replyCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    format: "plain" as const,
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connectionA,
      {
        postId: post.id as string & tags.Format<"uuid">,
        commentId: parentComment.id as string & tags.Format<"uuid">,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  TestValidator.equals(
    "reply parent comment should match",
    reply.parent_comment.id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply post summary should match post id",
    reply.post.id,
    post.id,
  );
  TestValidator.equals(
    "reply author should be member A",
    reply.author.id,
    memberA.id,
  );

  // 7. Unauthenticated access: clone connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    host: connection.host,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated user cannot retrieve reply in private community",
    async () => {
      await api.functional.communityPlatform.posts.comments.replies.at(
        unauthenticatedConnection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          commentId: parentComment.id as string & tags.Format<"uuid">,
          replyId: reply.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 8. Create Member B on a separate connection, representing non-member user
  const connectionB: api.IConnection = { ...connection };
  const memberBJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connectionB, {
      body: memberBJoinInput,
    });
  typia.assert(memberB);

  TestValidator.notEquals(
    "member B should be a different user than member A",
    memberB.id,
    memberA.id,
  );

  // 9. As Member B (non-member), attempt to retrieve the reply and expect denial
  await TestValidator.error(
    "non-member memberUser cannot retrieve reply in private community",
    async () => {
      await api.functional.communityPlatform.posts.comments.replies.at(
        connectionB,
        {
          postId: post.id as string & tags.Format<"uuid">,
          commentId: parentComment.id as string & tags.Format<"uuid">,
          replyId: reply.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 10. As Member A (authorized and member), retrieve the reply successfully
  const visibleReplyComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.replies.at(
      connectionA,
      {
        postId: post.id as string & tags.Format<"uuid">,
        commentId: parentComment.id as string & tags.Format<"uuid">,
        replyId: reply.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(visibleReplyComment);

  // Validate relationships and author on the retrieved reply comment
  TestValidator.equals(
    "retrieved reply comment id should match reply id",
    visibleReplyComment.id,
    reply.id,
  );
  TestValidator.equals(
    "retrieved reply comment post id should match post",
    visibleReplyComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "retrieved reply comment parent id should match parent comment",
    visibleReplyComment.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "retrieved reply comment author should be member A",
    visibleReplyComment.author.id,
    memberA.id,
  );
}
