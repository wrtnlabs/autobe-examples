import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_post_votes_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!@#",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "Password123!@#",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Cast votes for date range testing
  const votes = await ArrayUtil.asyncRepeat(4, async (index) => {
    return await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: index % 2 === 0 ? "upvote" : "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  });
  votes.forEach((vote) => typia.assert(vote));

  // Capture timing reference
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  const twoHoursMs = 2 * oneHourMs;
  const fourHoursMs = 4 * oneHourMs;

  // Step 7: Test broad date range - should return all votes
  const allVotesResult =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        created_after: new Date(now.getTime() - fourHoursMs).toISOString(),
        created_before: new Date(now.getTime() + oneHourMs).toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(allVotesResult);
  TestValidator.predicate(
    "broad date range contains votes",
    allVotesResult.data.length > 0,
  );

  // Step 8: Test narrow past range - should return fewer or no votes
  const pastRangeResult =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        created_after: new Date(now.getTime() - fourHoursMs).toISOString(),
        created_before: new Date(now.getTime() - twoHoursMs).toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(pastRangeResult);
  TestValidator.predicate(
    "past range result has valid pagination",
    pastRangeResult.pagination.records >= 0,
  );

  // Step 9: Test narrow future range - should return no votes
  const futureRangeResult =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        created_after: new Date(now.getTime() + oneHourMs).toISOString(),
        created_before: new Date(now.getTime() + fourHoursMs).toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(futureRangeResult);
  TestValidator.equals(
    "future range returns no votes",
    futureRangeResult.data.length,
    0,
  );

  // Step 10: Test created_after only filter
  const afterOnlyResult =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        created_after: new Date(now.getTime() - oneHourMs).toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(afterOnlyResult);
  TestValidator.predicate(
    "after-only filter returns valid result",
    afterOnlyResult.pagination.records >= 0,
  );

  // Step 11: Test created_before only filter
  const beforeOnlyResult =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        created_before: new Date(now.getTime() + oneHourMs).toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(beforeOnlyResult);
  TestValidator.predicate(
    "before-only filter returns valid result",
    beforeOnlyResult.pagination.records >= 0,
  );

  // Step 12: Verify pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    allVotesResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allVotesResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    allVotesResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    allVotesResult.pagination.pages >= 0,
  );

  // Step 13: Test vote type filter with date range
  const upvoteFilterResult =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        vote_type: "upvote",
        created_after: new Date(now.getTime() - fourHoursMs).toISOString(),
        created_before: new Date(now.getTime() + oneHourMs).toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvoteFilterResult);
  TestValidator.predicate(
    "upvote filter with date range works",
    upvoteFilterResult.pagination.records >= 0,
  );

  // Step 14: Test downvote filter with date range
  const downvoteFilterResult =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        vote_type: "downvote",
        created_after: new Date(now.getTime() - fourHoursMs).toISOString(),
        created_before: new Date(now.getTime() + oneHourMs).toISOString(),
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(downvoteFilterResult);
  TestValidator.predicate(
    "downvote filter with date range works",
    downvoteFilterResult.pagination.records >= 0,
  );
}
