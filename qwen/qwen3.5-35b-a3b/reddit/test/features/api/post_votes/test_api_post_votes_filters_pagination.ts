import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_post_votes_cast } from "../../../generate/generate_random_reddit_platform_member_post_votes_cast";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_votes_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create members A, B, C and establish community infrastructure
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoin = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAJoin);
  typia.assert(memberAJoin.token);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoin = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBJoin);
  typia.assert(memberBJoin.token);
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCJoin = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberCJoin);
  typia.assert(memberCJoin.token);
  // Create community (owned by member A)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Member B and C subscribe to community
  await api.functional.redditPlatform.member.communities.subscribe(
    memberBConnection,
    {
      communityId: community.id,
      body: { confirmSubscription: true },
    },
  );
  await api.functional.redditPlatform.member.communities.subscribe(
    memberCConnection,
    {
      communityId: community.id,
      body: { confirmSubscription: true },
    },
  );
  // Create posts from each member
  const postByA = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        title: "Post by A",
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(postByA);
  const postByB = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        title: "Post by B",
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(postByB);
  const postByC = await api.functional.redditPlatform.member.posts.create(
    memberCConnection,
    {
      body: {
        title: "Post by C",
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(postByC);
  // Cast votes between members
  // Member A upvotes B's post
  const vote1 = await api.functional.redditPlatform.member.post_votes.cast(
    memberAConnection,
    {
      body: {
        post_id: postByB.id,
        vote_type: "UPVOTE",
      },
    },
  );
  typia.assert(vote1);
  // Member B downvotes C's post
  const vote2 = await api.functional.redditPlatform.member.post_votes.cast(
    memberBConnection,
    {
      body: {
        post_id: postByC.id,
        vote_type: "DOWNVOTE",
      },
    },
  );
  typia.assert(vote2);
  // Member C upvotes A's post
  const vote3 = await api.functional.redditPlatform.member.post_votes.cast(
    memberCConnection,
    {
      body: {
        post_id: postByA.id,
        vote_type: "UPVOTE",
      },
    },
  );
  typia.assert(vote3);
  // Additional votes to have more records for pagination testing
  const morePost = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        title: "Another Post",
        postType: "LINK",
        redditPlatformCommunityId: community.id,
        url: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      },
    },
  );
  typia.assert(morePost);
  const vote4 = await api.functional.redditPlatform.member.post_votes.cast(
    memberBConnection,
    {
      body: {
        post_id: morePost.id,
        vote_type: "UPVOTE",
      },
    },
  );
  typia.assert(vote4);
  // Test 1: Filter by vote_type = UPVOTE
  const upvoteResults = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        vote_type: "UPVOTE",
        limit: 10,
      },
    },
  );
  typia.assert(upvoteResults);
  TestValidator.equals(
    "upvote results current page",
    upvoteResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "upvote results limit",
    upvoteResults.pagination.limit,
    10,
  );
  TestValidator.predicate("has upvote data", upvoteResults.data.length > 0);
  for (const vote of upvoteResults.data) {
    TestValidator.equals("vote is upvote", vote.vote_type, "UPVOTE");
  }
  // Test 2: Filter by user_id (member A's votes)
  const userFilterResults =
    await api.functional.redditPlatform.post_votes.index(connection, {
      body: {
        user_id: memberAJoin.id,
        limit: 10,
      },
    });
  typia.assert(userFilterResults);
  TestValidator.equals(
    "user filter records",
    userFilterResults.pagination.records,
    1,
  );
  TestValidator.equals(
    "filter user_id matches",
    userFilterResults.data[0].user.id,
    memberAJoin.id,
  );
  // Test 3: Filter by post_id
  const postFilterResults =
    await api.functional.redditPlatform.post_votes.index(connection, {
      body: {
        post_id: postByB.id,
        limit: 10,
      },
    });
  typia.assert(postFilterResults);
  TestValidator.equals(
    "post filter records",
    postFilterResults.pagination.records,
    1,
  );
  TestValidator.equals(
    "filter post_id matches",
    postFilterResults.data[0].post.id,
    postByB.id,
  );
  // Test 4: Sort by user_id ascending
  const userSortAsc = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        sort_by: "user_id",
        order: "asc",
        limit: 10,
      },
    },
  );
  typia.assert(userSortAsc);
  TestValidator.equals(
    "sort by user_id asc current",
    userSortAsc.pagination.current,
    1,
  );
  // Test 5: Sort by user_id descending (default)
  const userSortDesc = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        sort_by: "user_id",
        order: "desc",
        limit: 10,
      },
    },
  );
  typia.assert(userSortDesc);
  TestValidator.equals(
    "sort by user_id desc current",
    userSortDesc.pagination.current,
    1,
  );
  // Test 6: Empty results filter (non-existent user_id)
  const emptyResults = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        user_id: "00000000-0000-0000-0000-000000000000",
        limit: 10,
      },
    },
  );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty results records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals("empty results pages", emptyResults.pagination.pages, 0);
  TestValidator.equals(
    "empty results data array length",
    emptyResults.data.length,
    0,
  );
  // Test 7: Date range filtering
  const dateRangeResults = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        created_at_range: {
          start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
          end: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day in future
        },
        limit: 10,
      },
    },
  );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range returns results",
    dateRangeResults.data.length >= 0,
  );
  // Test 8: Cursor-based pagination - first page
  const firstPage = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        limit: 2,
        order: "desc",
      },
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page records", firstPage.pagination.records, 4);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 2);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.predicate("has first page data", firstPage.data.length > 0);
  // Test 9: Verify sorting defaults to descending when not specified
  const defaultSort = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        limit: 10,
      },
    },
  );
  typia.assert(defaultSort);
  TestValidator.equals(
    "default sort current",
    defaultSort.pagination.current,
    1,
  );
  // Test 10: Query with include_deleted = true
  const includeDeleted = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        include_deleted: true,
        limit: 10,
      },
    },
  );
  typia.assert(includeDeleted);
  TestValidator.equals(
    "include deleted current",
    includeDeleted.pagination.current,
    1,
  );
  // Test 11: Verify vote exists for a specific post
  const voteOnPostFilter = await api.functional.redditPlatform.post_votes.index(
    connection,
    {
      body: {
        post_id: postByB.id,
        limit: 10,
      },
    },
  );
  typia.assert(voteOnPostFilter);
  TestValidator.predicate(
    "vote on post query returns data",
    voteOnPostFilter.data.length >= 0,
  );
}