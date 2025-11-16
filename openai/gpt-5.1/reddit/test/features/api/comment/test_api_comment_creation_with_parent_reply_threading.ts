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
 * Validate nested reply comment creation with correct parent-child threading.
 *
 * Business context:
 *
 * - A member user should be able to create comments and nested replies on a post
 *   within a community they are a member of.
 * - Reply comments must reference an existing parent comment on the same post and
 *   preserve correct author and post relationships.
 *
 * Steps:
 *
 * 1. Register a new member user via memberUser join and obtain an authorized
 *    session.
 * 2. Create a new community using communityPlatform/memberUser/communities.create.
 * 3. Create a membership for the joined user in that community via
 *    communities.memberships.create.
 * 4. Create a post in that community via memberUser/posts.create.
 * 5. Create a top-level comment on that post (no parentCommentId).
 * 6. Create a reply comment with parentCommentId set to the top-level comment id.
 * 7. Assert reply is attached to the same post, references the parent comment id,
 *    and is authored by the same member user.
 */
export async function test_api_comment_creation_with_parent_reply_threading(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorization
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUserAuthorized);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(10),
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
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a membership for the member user in that community
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

  // Validate membership links correct community and member user
  TestValidator.equals(
    "membership community slug should match created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member user id should match joined user",
    membership.memberUser.id,
    memberUserAuthorized.id,
  );

  // 4. Create a post in the community
  const postBody = {
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
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post.community_id should match community.id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post.author_memberuser_id should match joined user id",
    post.author_memberuser_id,
    memberUserAuthorized.id,
  );

  // 5. Create a top-level comment (no parentCommentId)
  const topLevelContent: string = RandomGenerator.paragraph({ sentences: 4 });

  const topLevelCommentBody = {
    content: topLevelContent,
  } satisfies ICommunityPlatformComment.ICreate;

  const topLevelComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: topLevelCommentBody,
      },
    );
  typia.assert(topLevelComment);

  TestValidator.equals(
    "top-level comment post id should match post.id",
    topLevelComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "top-level comment author id should match joined user id",
    topLevelComment.author.id,
    memberUserAuthorized.id,
  );
  TestValidator.predicate(
    "top-level comment should have no parent_comment_id",
    topLevelComment.parent_comment_id === null ||
      topLevelComment.parent_comment_id === undefined,
  );

  // 6. Create a reply comment with parentCommentId set to the top-level comment id
  const replyContent: string = RandomGenerator.paragraph({ sentences: 3 });

  const replyCommentBody = {
    content: replyContent,
    parentCommentId: topLevelComment.id,
  } satisfies ICommunityPlatformComment.ICreate;

  const replyComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: replyCommentBody,
      },
    );
  typia.assert(replyComment);

  // 7. Validate reply threading and author/post linkage
  TestValidator.equals(
    "reply comment post id should match original post id",
    replyComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "reply comment parent_comment_id should match top-level comment id",
    replyComment.parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "reply comment author id should match joined user id",
    replyComment.author.id,
    memberUserAuthorized.id,
  );
  TestValidator.equals(
    "reply comment body should match input content",
    replyComment.body,
    replyContent,
  );
}
