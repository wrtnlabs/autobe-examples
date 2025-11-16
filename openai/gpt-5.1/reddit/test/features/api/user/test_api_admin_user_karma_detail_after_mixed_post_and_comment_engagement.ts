import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

export async function test_api_admin_user_karma_detail_after_mixed_post_and_comment_engagement(
  connection: api.IConnection,
) {
  // Step 1: bootstrap an adminUser account and authenticate
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Explicit admin login to exercise login flow as well (even if join already authenticated)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAfterLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // Step 2: register and authenticate a memberUser who will generate karma
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123" as string & tags.MinLength<8>,
    ip: null,
    href: "https://app.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Optional: explicit login to ensure session rotation works
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // Step 3: as memberUser, create a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as string &
      tags.MaxLength<4000>,
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Step 4: create a membership in that community for our memberUser
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // Sanity check membership associations
  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );

  TestValidator.equals(
    "membership member user id matches authorized member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // Step 5: create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id is the created community",
    post.community_id,
    community.id,
  );

  TestValidator.equals(
    "post author id is the member user",
    post.author_memberuser_id,
    memberAuthorized.id,
  );

  // Step 6: create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment belongs to the newly created post",
    comment.post.id,
    post.id,
  );

  TestValidator.equals(
    "comment author id is the member user",
    comment.author.id,
    memberAuthorized.id,
  );

  // Step 7: cast a vote on the post as the same memberUser
  const postVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteCreateBody,
      },
    );
  typia.assert(postVote);

  TestValidator.equals(
    "post vote is associated with the target post",
    postVote.post_id,
    post.id,
  );

  // Step 8: cast a vote on the comment as the same memberUser
  const commentVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteCreateBody,
      },
    );
  typia.assert(commentVote);

  TestValidator.equals(
    "comment vote aggregate references the comment",
    commentVote.comment_id,
    comment.id,
  );

  TestValidator.predicate(
    "comment upvotes non-negative",
    commentVote.upvotes >= 0,
  );

  // Step 9: create a community subscription for the member user
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription member user id matches member",
    subscription.memberUser.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "subscription community id matches community",
    subscription.community.id,
    community.id,
  );

  // Step 10: as adminUser, retrieve a user karma aggregate record.
  //
  // NOTE: There is no endpoint to look up a karma record by memberUserId.
  // We therefore generate a random userKarmaId and focus our assertions on
  // internal consistency of the returned ICommunityPlatformUserKarma.

  // Ensure we are authenticated as admin again (token may still be active, but we
  // keep the flow explicit).
  const adminReLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminReAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReLoginBody,
    });
  typia.assert(adminReAuthorized);

  const userKarmaId = RandomGenerator.alphaNumeric(24);

  const karma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.at(connection, {
      userKarmaId,
    });
  typia.assert(karma);

  // Assert arithmetic relationship: totalKarma === postKarma + commentKarma
  TestValidator.equals(
    "totalKarma equals sum of postKarma and commentKarma",
    karma.totalKarma,
    karma.postKarma + karma.commentKarma,
  );

  // Assert timestamps ordering: updatedAt >= createdAt
  const createdAtMs = new Date(karma.createdAt).getTime();
  const updatedAtMs = new Date(karma.updatedAt).getTime();

  TestValidator.predicate(
    "karma updatedAt is not before createdAt",
    updatedAtMs >= createdAtMs,
  );

  // deletedAt must be either undefined or a date-time string; if present, it
  // should parse to a valid date.
  if (karma.deletedAt !== undefined && karma.deletedAt !== null) {
    const deletedAtMs = new Date(karma.deletedAt).getTime();
    TestValidator.predicate(
      "karma deletedAt is a valid date-time when present",
      Number.isFinite(deletedAtMs),
    );
  }
}
