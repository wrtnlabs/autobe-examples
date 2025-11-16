import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";

/**
 * Validate platformAdmin post vote search with filters and pagination.
 *
 * Business flow:
 *
 * 1. Create a platformAdmin account and use it to configure visibility level and
 *    post type master data.
 * 2. Create a memberUser account that will own a community, posts, subscriptions,
 *    and votes.
 * 3. As memberUser, create a community referencing the chosen visibility level and
 *    create two posts in that community using the configured post type.
 * 4. As memberUser, create both a generic community subscription and a
 *    memberUser-scoped subscription to simulate realistic data.
 * 5. As memberUser, cast multiple votes across the posts (one upvote and one
 *    downvote) and record their relationships.
 * 6. Switch back to platformAdmin and call PATCH
 *    /communityPlatform/platformAdmin/postVotes with various filter
 *    combinations on post_id, member_user_id, community_id, vote_value, and
 *    created_at range while checking pagination metadata and filtered results.
 */
export async function test_api_post_vote_search_by_platform_admin_with_filters(
  connection: api.IConnection,
) {
  // 1. Register platformAdmin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(16);

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      ip: RandomGenerator.alphaNumeric(8),
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  // 2. Create visibility level as platformAdmin
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibility =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Test Visibility",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibility);

  // 3. Create post type as platformAdmin
  const postTypeCode = `text-${RandomGenerator.alphaNumeric(6)}`;
  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: "Text Post",
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 4. Register memberUser (join returns authorized + sets token)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      ip: RandomGenerator.alphaNumeric(10),
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberId = memberJoin.id;

  // 5. As memberUser, create a community referencing visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: "Filter Test Community",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. As memberUser, create two posts in the community
  const postBodies: ICommunityPlatformPost.ICreate[] = [
    {
      community_id: community.id,
      post_type_id: postType.id,
      title: "First test post",
      body: RandomGenerator.paragraph({ sentences: 10 }),
      url: null,
      image_uri: null,
    },
    {
      community_id: community.id,
      post_type_id: postType.id,
      title: "Second test post",
      body: RandomGenerator.paragraph({ sentences: 7 }),
      url: null,
      image_uri: null,
    },
  ];

  const post1 = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postBodies[0],
    },
  );
  typia.assert<ICommunityPlatformPost>(post1);

  const post2 = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postBodies[1],
    },
  );
  typia.assert<ICommunityPlatformPost>(post2);

  // 7. MemberUser generic subscription to community
  const subscription1 =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription1);

  // 8. MemberUser-scoped subscription using memberUserId path param
  const subscription2 =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberId,
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription2);

  // 9. MemberUser casts votes: upvote on post1 and downvote on post2
  const voteUp =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: {
          community_platform_post_id: post1.id,
          vote_value: 1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(voteUp);

  const voteDown =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: {
          community_platform_post_id: post2.id,
          vote_value: -1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(voteDown);

  // 10. Switch back to platformAdmin via login to ensure admin token is active
  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLogin);

  // 11-a. Base query: filter by post_id and member_user_id
  const baseRequest: ICommunityPlatformPostVote.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "asc",
    post_id: post1.id,
    member_user_id: memberId,
    community_id: undefined,
    vote_value: undefined,
    created_from: undefined,
    created_to: undefined,
  };

  const basePage =
    await api.functional.communityPlatform.platformAdmin.postVotes.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPostVote.ISummary>(basePage);

  TestValidator.equals(
    "base pagination current page",
    basePage.pagination.current,
    baseRequest.page,
  );
  TestValidator.equals(
    "base pagination limit",
    basePage.pagination.limit,
    baseRequest.limit,
  );
  TestValidator.predicate(
    "base pagination records >= data length",
    basePage.pagination.records >= basePage.data.length,
  );

  for (const summary of basePage.data) {
    TestValidator.equals(
      "summary post matches filter post1",
      summary.post.id,
      post1.id,
    );
    TestValidator.equals(
      "summary memberUser matches filter memberId",
      summary.memberUser.id,
      memberId,
    );
    TestValidator.equals(
      "summary community matches community",
      summary.community.id,
      community.id,
    );
  }

  // 11-b. Filter by vote_value = 1 (upvotes)
  const upRequest: ICommunityPlatformPostVote.IRequest = {
    ...baseRequest,
    vote_value: 1,
  };
  const upPage =
    await api.functional.communityPlatform.platformAdmin.postVotes.index(
      connection,
      {
        body: upRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPostVote.ISummary>(upPage);

  for (const summary of upPage.data) {
    TestValidator.equals("upvote direction is up", summary.direction, "up");
    if (upRequest.post_id)
      TestValidator.equals(
        "upvote post filter respected",
        summary.post.id,
        upRequest.post_id,
      );
  }

  // 11-c. Filter by vote_value = -1 (downvotes) on post2
  const downRequest: ICommunityPlatformPostVote.IRequest = {
    ...baseRequest,
    post_id: post2.id,
    vote_value: -1,
  };
  const downPage =
    await api.functional.communityPlatform.platformAdmin.postVotes.index(
      connection,
      {
        body: downRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPostVote.ISummary>(downPage);

  for (const summary of downPage.data) {
    TestValidator.equals(
      "downvote direction is down",
      summary.direction,
      "down",
    );
    TestValidator.equals(
      "downvote post filter respected",
      summary.post.id,
      post2.id,
    );
  }

  // 11-d. Filter by community_id only
  const communityRequest: ICommunityPlatformPostVote.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "asc",
    post_id: undefined,
    member_user_id: undefined,
    community_id: community.id,
    vote_value: undefined,
    created_from: undefined,
    created_to: undefined,
  };

  const communityPage =
    await api.functional.communityPlatform.platformAdmin.postVotes.index(
      connection,
      {
        body: communityRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPostVote.ISummary>(communityPage);

  for (const summary of communityPage.data) {
    TestValidator.equals(
      "community filter respected",
      summary.community.id,
      community.id,
    );
  }

  // 11-e. Time range filters
  const fromInclusive = voteUp.created_at;
  const toInclusive = voteDown.created_at;

  const rangeRequest: ICommunityPlatformPostVote.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "asc",
    post_id: undefined,
    member_user_id: memberId,
    community_id: community.id,
    vote_value: undefined,
    created_from: fromInclusive,
    created_to: toInclusive,
  };

  const rangePage =
    await api.functional.communityPlatform.platformAdmin.postVotes.index(
      connection,
      {
        body: rangeRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPostVote.ISummary>(rangePage);

  for (const summary of rangePage.data) {
    TestValidator.equals(
      "range filter member respected",
      summary.memberUser.id,
      memberId,
    );
    TestValidator.equals(
      "range filter community respected",
      summary.community.id,
      community.id,
    );
  }

  // Time window outside all votes: choose a date long before created_at
  const pastFrom = "2000-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;
  const pastTo = "2000-01-02T00:00:00.000Z" as string &
    tags.Format<"date-time">;

  const emptyRangeRequest: ICommunityPlatformPostVote.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "asc",
    post_id: undefined,
    member_user_id: memberId,
    community_id: community.id,
    vote_value: undefined,
    created_from: pastFrom,
    created_to: pastTo,
  };

  const emptyRangePage =
    await api.functional.communityPlatform.platformAdmin.postVotes.index(
      connection,
      {
        body: emptyRangeRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPostVote.ISummary>(emptyRangePage);

  TestValidator.equals(
    "empty range records is 0",
    emptyRangePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty range data length is 0",
    emptyRangePage.data.length,
    0,
  );

  // 11-f. Pagination behavior with limit = 1 if there are at least 2 votes
  const paginationRequest: ICommunityPlatformPostVote.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "asc",
    post_id: undefined,
    member_user_id: memberId,
    community_id: community.id,
    vote_value: undefined,
    created_from: undefined,
    created_to: undefined,
  };

  const page1 =
    await api.functional.communityPlatform.platformAdmin.postVotes.index(
      connection,
      {
        body: paginationRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPostVote.ISummary>(page1);

  TestValidator.equals(
    "pagination page1 current",
    page1.pagination.current,
    paginationRequest.page,
  );
  TestValidator.equals(
    "pagination page1 limit",
    page1.pagination.limit,
    paginationRequest.limit,
  );

  if (page1.pagination.records >= 2) {
    const page2Request: ICommunityPlatformPostVote.IRequest = {
      ...paginationRequest,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    };

    const page2 =
      await api.functional.communityPlatform.platformAdmin.postVotes.index(
        connection,
        {
          body: page2Request,
        },
      );
    typia.assert<IPageICommunityPlatformPostVote.ISummary>(page2);

    TestValidator.equals(
      "pagination page2 current",
      page2.pagination.current,
      page2Request.page,
    );

    if (page1.data.length > 0 && page2.data.length > 0) {
      const id1 = page1.data[0].id;
      const id2 = page2.data[0].id;
      TestValidator.notEquals(
        "page1 and page2 first vote ids differ when records >= 2",
        id1,
        id2,
      );
    }
  }
}
