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
 * Ensure that a specific reply on a comment can be retrieved publicly (without
 * authentication) when it belongs to a visible post and comment in a public
 * community.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a member user (author) using the memberUser join endpoint.
 * 2. As that member, create a public community that allows normal posting.
 * 3. Create a membership for the author in that community.
 * 4. Create a post inside the community as the author.
 * 5. Create a top-level parent comment on the post.
 * 6. Create a reply under that parent comment and capture its ID.
 * 7. Clone the connection into an "unauthenticated" connection by overriding
 *    headers with an empty object.
 * 8. Use the unauthenticated connection to GET the reply detail endpoint and
 *    verify that:
 *
 *    - The reply is returned as an ICommunityPlatformComment.
 *    - The returned comment corresponds to the reply (IDs match).
 *    - Post, author and parent comment relationships are consistent.
 *    - Status/deletion fields indicate that the reply is visible.
 */
export async function test_api_comment_reply_retrieval_public_visibility(
  connection: api.IConnection,
) {
  // 1. Register a new member user (author)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
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

  // 2. Create a public community
  const communitySlug: string = `community_${RandomGenerator.alphabets(8)}`;
  const communityBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
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

  // 3. Create membership for the author in the community
  const membershipBody = {
    role: "member",
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
    "membership community slug should match created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership memberUser id should match author id",
    membership.memberUser.id,
    author.id,
  );

  // 4. Create a post in the community
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

  TestValidator.equals(
    "post community_id should equal created community.id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author_memberuser_id should equal author.id",
    post.author_memberuser_id,
    author.id,
  );

  // 5. Create a top-level parent comment on the post
  const parentCommentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentBody,
      },
    );
  typia.assert(parentComment);

  TestValidator.equals(
    "parent comment should be attached to the correct post",
    parentComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent comment author should be the joined member",
    parentComment.author.id,
    author.id,
  );
  TestValidator.equals(
    "parent comment should have no parent_comment_id (top-level)",
    parentComment.parent_comment_id ?? null,
    null,
  );

  // 6. Create a reply to the parent comment
  const replyBodyContent = RandomGenerator.paragraph({ sentences: 3 });
  const replyBody = {
    body: replyBodyContent,
    format: "plain" as const,
    replyContext: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  TestValidator.equals(
    "reply post id should match post.id",
    reply.post.id,
    post.id,
  );
  TestValidator.equals(
    "reply parent_comment id should match parentComment.id",
    reply.parent_comment.id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply author should be the joined member",
    reply.author.id,
    author.id,
  );
  TestValidator.equals(
    "reply content should match the body we sent",
    reply.content,
    replyBodyContent,
  );
  TestValidator.predicate(
    "reply should not be marked as deleted",
    reply.is_deleted === false,
  );
  TestValidator.equals(
    "reply deleted_at should be null or undefined (not deleted)",
    reply.deleted_at ?? null,
    null,
  );

  // 7. Create an unauthenticated connection by clearing headers
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Public GET of the reply via the "posts" public endpoint
  const publicReplyComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.replies.at(
      guestConnection,
      {
        postId: post.id,
        commentId: parentComment.id,
        replyId: reply.id,
      },
    );
  typia.assert(publicReplyComment);

  // Validate that the returned comment is the reply and relationships match
  TestValidator.equals(
    "public reply comment id should equal reply.id",
    publicReplyComment.id,
    reply.id,
  );
  TestValidator.equals(
    "public reply's post.id should match post.id",
    publicReplyComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "public reply's author.id should match author.id",
    publicReplyComment.author.id,
    author.id,
  );
  TestValidator.equals(
    "public reply's parent_comment_id should match parentComment.id",
    publicReplyComment.parent_comment_id,
    parentComment.id,
  );

  TestValidator.predicate(
    "public reply status should be a non-empty string (visible-ish)",
    typeof publicReplyComment.status === "string" &&
      publicReplyComment.status.length > 0,
  );
  TestValidator.equals(
    "public reply deleted_at should be null or undefined (not deleted)",
    publicReplyComment.deleted_at ?? null,
    null,
  );
}
