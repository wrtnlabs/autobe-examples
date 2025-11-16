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

export async function test_api_admin_increase_user_karma_for_reward_or_restoration(
  connection: api.IConnection,
) {
  // 1. Register memberUser (the user who will receive karma reward)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register adminUser (who will adjust karma)
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

  // 3. Login as memberUser to create community and participate
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Member creates a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
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
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug must match request",
    community.slug,
    communityCreateBody.slug,
  );

  // 5. Member joins the community
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

  TestValidator.equals(
    "membership community slug matches",
    membership.community.slug,
    community.slug,
  );

  // 6. Member creates a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id matches",
    post.community_id,
    community.id,
  );

  // 7. Member comments on the post
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

  TestValidator.equals("comment post id matches", comment.post.id, post.id);

  // 8. Member casts a positive vote on their own post (baseline positive karma)
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
    "post vote direction must be up",
    postVote.direction,
    postVoteCreateBody.direction,
  );

  // 9. Member casts a positive vote on their own comment
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
    "comment vote myVote should be up",
    commentVote.myVote,
    commentVoteCreateBody.direction,
  );

  // 10. Member subscribes to the community
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
    "subscription community id matches",
    subscription.community.id,
    community.id,
  );

  // 11. Login as adminUser to perform karma reward/restoration
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 12. Admin updates the user karma aggregate with a reward payload
  const userKarmaId = typia.random<string & tags.Format<"uuid">>();

  const rewardedPostKarma = 120 as number & tags.Type<"int32">;
  const rewardedCommentKarma = 80 as number & tags.Type<"int32">;
  const rewardedTotalKarma = 200 as number & tags.Type<"int32">;

  const karmaUpdateBody = {
    postKarma: rewardedPostKarma,
    commentKarma: rewardedCommentKarma,
    totalKarma: rewardedTotalKarma,
  } satisfies ICommunityPlatformUserKarma.IUpdate;

  const updatedKarma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.update(
      connection,
      {
        userKarmaId,
        body: karmaUpdateBody,
      },
    );
  typia.assert(updatedKarma);

  // 13. Assertions on updated karma aggregate
  TestValidator.equals(
    "updated karma id must match userKarmaId",
    updatedKarma.id,
    userKarmaId,
  );

  TestValidator.equals(
    "updated postKarma matches rewarded value",
    updatedKarma.postKarma,
    rewardedPostKarma,
  );

  TestValidator.equals(
    "updated commentKarma matches rewarded value",
    updatedKarma.commentKarma,
    rewardedCommentKarma,
  );

  TestValidator.equals(
    "updated totalKarma matches rewarded value",
    updatedKarma.totalKarma,
    rewardedTotalKarma,
  );

  TestValidator.predicate(
    "memberUserId on karma should be non-empty UUID string",
    updatedKarma.memberUserId.length > 0,
  );

  TestValidator.notEquals(
    "updatedAt should differ from createdAt after update",
    updatedKarma.updatedAt,
    updatedKarma.createdAt,
  );

  TestValidator.equals(
    "deletedAt should remain undefined or null after reward",
    updatedKarma.deletedAt ?? null,
    null,
  );
}
