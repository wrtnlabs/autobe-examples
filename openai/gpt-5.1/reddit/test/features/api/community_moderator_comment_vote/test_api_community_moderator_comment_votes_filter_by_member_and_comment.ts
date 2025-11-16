import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Validate that a community moderator can filter comment votes by specific
 * member user and comment.
 *
 * Business workflow covered by this test:
 *
 * 1. Platform admin joins and creates required master data:
 *
 *    - A community visibility level
 *    - A post type
 * 2. Two member users join: voterA and voterB.
 * 3. As voterA:
 *
 *    - Create a community using the created visibility level
 *    - Create a post in that community using the created post type
 *    - Create a comment on that post
 * 4. As voterA and voterB, cast votes on the same comment via POST
 *    /communityPlatform/memberUser/commentVotes.
 * 5. As community moderator, query PATCH
 *    /communityPlatform/communityModerator/commentVotes with filters:
 *
 *    - Community_platform_memberuser_id = voterA.id
 *    - Community_platform_comment_id = comment.id
 * 6. Assert that only voterA's vote on that comment is returned, and voterB's vote
 *    is excluded. Validate that each returned summary has the correct
 *    memberUser and comment summaries.
 * 7. Optionally repeat for voterB to confirm symmetric behavior.
 */
export async function test_api_community_moderator_comment_votes_filter_by_member_and_comment(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates master data
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // Create visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibility);

  // Create post type
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 2. Two member users join: voterA and voterB
  const commonMemberHref = "https://app.example.com/join" as const;
  const commonMemberReferrer = "https://app.example.com" as const;

  const voterAJoinBody = {
    username: `voterA_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: commonMemberHref,
    referrer: commonMemberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const voterA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: voterAJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(voterA);

  const voterBJoinBody = {
    username: `voterB_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: commonMemberHref,
    referrer: commonMemberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const voterB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: voterBJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(voterB);

  // 3. As voterA, log in and create community, post, and comment
  const voterALoginBody = {
    identifier: voterA.email,
    password: voterAJoinBody.password,
    ip: null,
    href: commonMemberHref,
    referrer: commonMemberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const voterALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: voterALoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(voterALogin);

  const communityCreateBody = {
    identifier: `test-community-${RandomGenerator.alphaNumeric(6)}`,
    title: "Moderator Vote Filter Test Community",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Vote filtering test post",
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  const commentCreateBody = {
    body: "Test comment for moderator filtering",
    parentCommentId: undefined,
    renderingMode: "plainText",
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 4. Cast votes from voterA (up) and voterB (down) on the same comment
  const voterAUpvoteBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const voterAUpvote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: voterAUpvoteBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(voterAUpvote);

  const voterBLoginBody = {
    identifier: voterB.email,
    password: voterBJoinBody.password,
    ip: null,
    href: commonMemberHref,
    referrer: commonMemberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const voterBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: voterBLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(voterBLogin);

  const voterBDownvoteBody = {
    community_platform_comment_id: comment.id,
    vote_value: -1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const voterBDownvote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: voterBDownvoteBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(voterBDownvote);

  // 5. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderator);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLogin,
  );

  // 6. Moderator filters by voterA and comment.id
  const page = 1 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;

  const moderatorFilterForVoterA = {
    page,
    limit,
    community_platform_memberuser_id: voterA.id,
    community_platform_comment_id: comment.id,
    vote_value: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by_created_at: "desc",
  } satisfies ICommunityPlatformCommentVote.IRequest;

  const pageForVoterA: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.communityModerator.commentVotes.index(
      connection,
      {
        body: moderatorFilterForVoterA,
      },
    );
  typia.assert<IPageICommunityPlatformCommentVote.ISummary>(pageForVoterA);

  // 7. Assertions for voterA filtering
  TestValidator.predicate(
    "pagination current page equals requested page",
    pageForVoterA.pagination.current === moderatorFilterForVoterA.page,
  );

  TestValidator.predicate(
    "all returned votes belong to voterA on the target comment",
    pageForVoterA.data.every((vote) => {
      return vote.memberUser.id === voterA.id && vote.comment.id === comment.id;
    }),
  );

  TestValidator.predicate(
    "no vote from voterB is included in voterA-filtered result",
    pageForVoterA.data.every((vote) => vote.memberUser.id !== voterB.id),
  );

  TestValidator.predicate(
    "at least one vote for voterA on comment is returned",
    pageForVoterA.data.length >= 1,
  );

  // 8. Optional symmetric check: filter by voterB
  const moderatorFilterForVoterB = {
    page,
    limit,
    community_platform_memberuser_id: voterB.id,
    community_platform_comment_id: comment.id,
    vote_value: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by_created_at: "desc",
  } satisfies ICommunityPlatformCommentVote.IRequest;

  const pageForVoterB: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.communityModerator.commentVotes.index(
      connection,
      {
        body: moderatorFilterForVoterB,
      },
    );
  typia.assert<IPageICommunityPlatformCommentVote.ISummary>(pageForVoterB);

  TestValidator.predicate(
    "all returned votes belong to voterB on the target comment",
    pageForVoterB.data.every((vote) => {
      return vote.memberUser.id === voterB.id && vote.comment.id === comment.id;
    }),
  );

  TestValidator.predicate(
    "no vote from voterA is included in voterB-filtered result",
    pageForVoterB.data.every((vote) => vote.memberUser.id !== voterA.id),
  );
}
