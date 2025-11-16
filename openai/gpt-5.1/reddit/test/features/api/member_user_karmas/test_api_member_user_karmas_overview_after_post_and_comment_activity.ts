import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberUserKarmasOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUserKarmasOverview";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserCommentKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCommentKarmas";
import type { ICommunityPlatformUserPostKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPostKarmas";
import type { ICommunityPlatformUserTotalKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserTotalKarmas";

export async function test_api_member_user_karmas_overview_after_post_and_comment_activity(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and log them in (join already authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register primary member user (author) and implicitly authenticate
  const primaryJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const primaryMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: primaryJoinBody,
    });
  typia.assert(primaryMember);

  // 4. As primary member user, create a community using the created visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Subscribe primary member to the community
  const primarySubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const primarySubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: primarySubscriptionBody },
    );
  typia.assert(primarySubscription);
  TestValidator.equals(
    "primary subscription community id matches",
    primarySubscription.community_id,
    community.id,
  );

  // 6. Create a post by the primary member user
  // For post_type_id we don't have a creator, so we assume existence and
  // use a random UUID to satisfy the type. This means we can't assert that
  // the post type is meaningful, only that the API accepts it under
  // simulation or test data conditions.
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community id matches community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post author id matches primary member",
    post.author.id,
    primaryMember.id,
  );

  // 7. Create secondary member users who will vote
  const secondaryMembers: ICommunityPlatformMemberuser.IAuthorized[] = [];

  const secondaryCount = 2;
  for (let i = 0; i < secondaryCount; i += 1) {
    const secondaryJoinBody = {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!",
      ip: "127.0.0.1",
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest;

    const secondaryMember = await api.functional.auth.memberUser.join(
      connection,
      {
        body: secondaryJoinBody,
      },
    );
    typia.assert(secondaryMember);
    secondaryMembers.push(secondaryMember);

    // Subscribe each secondary member to the community
    const secondarySubscriptionBody = {
      community_id: community.id,
      status: "active",
    } satisfies ICommunityPlatformCommunitySubscription.ICreate;

    const secondarySubscription: ICommunityPlatformCommunitySubscription =
      await api.functional.communityPlatform.memberUser.subscriptions.create(
        connection,
        { body: secondarySubscriptionBody },
      );
    typia.assert(secondarySubscription);
    TestValidator.equals(
      "secondary subscription community id matches",
      secondarySubscription.community_id,
      community.id,
    );
  }

  // Helper to switch authentication to a given member user by logging in
  const loginAsMember = async (
    member: ICommunityPlatformMemberuser.IAuthorized,
  ): Promise<void> => {
    const loginBody = {
      identifier: member.email,
      password: "MemberPass123!",
      ip: "127.0.0.1",
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest;

    const loggedIn = await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
    typia.assert(loggedIn);
    TestValidator.equals("logged in member id matches", loggedIn.id, member.id);
  };

  // 8. Secondary members cast post votes on the primary member’s post
  // We'll cast +1 from first secondary, -1 from second secondary to have
  // some non-trivial mix. Exact aggregation is unknown, but at least some
  // karma should result.
  await loginAsMember(secondaryMembers[0]);
  const upvoteBody = {
    community_platform_post_id: post.id,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const upvote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: upvoteBody },
    );
  typia.assert(upvote);

  await loginAsMember(secondaryMembers[1]);
  const downvoteBody = {
    community_platform_post_id: post.id,
    vote_value: -1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const downvote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: downvoteBody },
    );
  typia.assert(downvote);

  // 9. Primary member creates a comment on their post
  await loginAsMember(primaryMember);
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
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

  // 10. Secondary members cast comment votes
  await loginAsMember(secondaryMembers[0]);
  const commentUpvoteBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentUpvote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      { body: commentUpvoteBody },
    );
  typia.assert(commentUpvote);

  await loginAsMember(secondaryMembers[1]);
  const commentDownvoteBody = {
    community_platform_comment_id: comment.id,
    vote_value: -1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentDownvote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      { body: commentDownvoteBody },
    );
  typia.assert(commentDownvote);

  // 11. Fetch karma overview for primary member user
  const karmasBefore: ICommunityPlatformMemberUserKarmasOverview =
    await api.functional.communityPlatform.memberUsers.karmas.at(connection, {
      memberUserId: primaryMember.id,
    });
  typia.assert(karmasBefore);

  const totalBefore: ICommunityPlatformUserTotalKarmas = karmasBefore.total;
  const postBefore: ICommunityPlatformUserPostKarmas = karmasBefore.post;
  const commentBefore: ICommunityPlatformUserCommentKarmas =
    karmasBefore.comment;

  // Basic invariants: non-negativity
  TestValidator.predicate(
    "total.total_karma must be >= 0",
    totalBefore.total_karma >= 0,
  );
  TestValidator.predicate(
    "total.post_karma must be >= 0",
    totalBefore.post_karma >= 0,
  );
  TestValidator.predicate(
    "total.comment_karma must be >= 0",
    totalBefore.comment_karma >= 0,
  );
  TestValidator.predicate(
    "post.post_karma must be >= 0",
    postBefore.post_karma >= 0,
  );
  TestValidator.predicate(
    "comment.comment_karma must be >= 0",
    commentBefore.comment_karma >= 0,
  );

  // Relationship between total and per-dimension aggregates
  const perDimensionMaxBefore = Math.max(
    postBefore.post_karma,
    commentBefore.comment_karma,
  );
  TestValidator.predicate(
    "total.total_karma must be at least max(post_karma, comment_karma)",
    totalBefore.total_karma >= perDimensionMaxBefore,
  );

  TestValidator.predicate(
    "total.post_karma must be >= post.post_karma",
    totalBefore.post_karma >= postBefore.post_karma,
  );
  TestValidator.predicate(
    "total.comment_karma must be >= comment.comment_karma",
    totalBefore.comment_karma >= commentBefore.comment_karma,
  );

  // 12. Flip one of the post votes to see that karma changes
  await loginAsMember(secondaryMembers[1]);
  const flippedVoteBody = {
    community_platform_post_id: post.id,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const flippedVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      { body: flippedVoteBody },
    );
  typia.assert(flippedVote);

  const karmasAfter: ICommunityPlatformMemberUserKarmasOverview =
    await api.functional.communityPlatform.memberUsers.karmas.at(connection, {
      memberUserId: primaryMember.id,
    });
  typia.assert(karmasAfter);

  const totalAfter: ICommunityPlatformUserTotalKarmas = karmasAfter.total;
  const postAfter: ICommunityPlatformUserPostKarmas = karmasAfter.post;
  const commentAfter: ICommunityPlatformUserCommentKarmas = karmasAfter.comment;

  // Re-check invariants after vote change
  TestValidator.predicate(
    "total.total_karma after change must be >= 0",
    totalAfter.total_karma >= 0,
  );
  TestValidator.predicate(
    "total.post_karma after change must be >= 0",
    totalAfter.post_karma >= 0,
  );
  TestValidator.predicate(
    "total.comment_karma after change must be >= 0",
    totalAfter.comment_karma >= 0,
  );
  TestValidator.predicate(
    "post.post_karma after change must be >= 0",
    postAfter.post_karma >= 0,
  );
  TestValidator.predicate(
    "comment.comment_karma after change must be >= 0",
    commentAfter.comment_karma >= 0,
  );

  const perDimensionMaxAfter = Math.max(
    postAfter.post_karma,
    commentAfter.comment_karma,
  );
  TestValidator.predicate(
    "total.total_karma after change must be at least max(post_karma, comment_karma)",
    totalAfter.total_karma >= perDimensionMaxAfter,
  );

  TestValidator.predicate(
    "total.post_karma after change must be >= post.post_karma",
    totalAfter.post_karma >= postAfter.post_karma,
  );
  TestValidator.predicate(
    "total.comment_karma after change must be >= comment.comment_karma",
    totalAfter.comment_karma >= commentAfter.comment_karma,
  );

  // Finally, ensure that at least one of the core metrics has changed to
  // confirm the overview responds to voting activity.
  const metricsChanged =
    totalAfter.total_karma !== totalBefore.total_karma ||
    totalAfter.post_karma !== totalBefore.post_karma ||
    totalAfter.comment_karma !== totalBefore.comment_karma ||
    postAfter.post_karma !== postBefore.post_karma ||
    commentAfter.comment_karma !== commentBefore.comment_karma;

  TestValidator.predicate(
    "at least one karma metric should change after flipping a vote",
    metricsChanged,
  );
}
