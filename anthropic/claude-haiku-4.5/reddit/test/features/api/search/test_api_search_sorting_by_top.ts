import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

export async function test_api_search_sorting_by_top(
  connection: api.IConnection,
) {
  // Create first member for content creation
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create posts with different content to ensure search results
  const posts: ICommunityPlatformPost[] = [];
  const postTitles = [
    "Advanced TypeScript Patterns",
    "React Performance Optimization",
    "Node.js Best Practices",
    "Testing Strategies for APIs",
    "Database Design Fundamentals",
  ];

  for (const title of postTitles) {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: title,
          content_text: RandomGenerator.content({ paragraphs: 2 }),
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // Create additional members for voting to establish different vote scores
  const voters: ICommunityPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const voter = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(voter);
    voters.push(voter);
  }

  // Establish different vote scores for posts
  const votePatterns = [
    { upvoterCount: 5, downvoterCount: 1 }, // post 0: 4 net votes
    { upvoterCount: 3, downvoterCount: 2 }, // post 1: 1 net votes
    { upvoterCount: 5, downvoterCount: 0 }, // post 2: 5 net votes (highest)
    { upvoterCount: 2, downvoterCount: 1 }, // post 3: 1 net votes
    { upvoterCount: 4, downvoterCount: 1 }, // post 4: 3 net votes
  ];

  for (let i = 0; i < posts.length; i++) {
    const pattern = votePatterns[i];
    const post = posts[i];

    // Switch to each voter and cast their vote
    for (let voterIdx = 0; voterIdx < pattern.upvoterCount; voterIdx++) {
      if (voterIdx < voters.length) {
        // Create a temporary connection with the voter's token
        const voterConnection: api.IConnection = {
          ...connection,
          headers: {
            ...connection.headers,
            Authorization: voters[voterIdx].token.access,
          },
        };

        await api.functional.communityPlatform.member.votes.create(
          voterConnection,
          {
            body: {
              content_type: "post",
              content_id: post.id,
              vote_type: "upvote",
            } satisfies ICommunityPlatformVote.ICreate,
          },
        );
      }
    }

    for (
      let downvoterIdx = pattern.upvoterCount;
      downvoterIdx < pattern.upvoterCount + pattern.downvoterCount;
      downvoterIdx++
    ) {
      if (downvoterIdx < voters.length) {
        const voterConnection: api.IConnection = {
          ...connection,
          headers: {
            ...connection.headers,
            Authorization: voters[downvoterIdx].token.access,
          },
        };

        await api.functional.communityPlatform.member.votes.create(
          voterConnection,
          {
            body: {
              content_type: "post",
              content_id: post.id,
              vote_type: "downvote",
            } satisfies ICommunityPlatformVote.ICreate,
          },
        );
      }
    }
  }

  // Test 1: Basic top sorting - results should be ordered by vote_score descending
  const searchResultTop = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: "TypeScript",
        page: 1,
        limit: 10,
        sortBy: "top",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(searchResultTop);

  // Verify results are sorted by vote_score in descending order
  const topResults = searchResultTop.data;
  for (let i = 1; i < topResults.length; i++) {
    const prevScore = topResults[i - 1].post?.vote_score ?? 0;
    const currScore = topResults[i].post?.vote_score ?? 0;
    TestValidator.predicate(
      "top sorting maintains descending vote_score order",
      prevScore >= currScore,
    );
  }

  // Test 2: Top sorting with community filter
  const communityFilteredSearch =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "TypeScript",
        page: 1,
        limit: 10,
        community: [community.id],
        sortBy: "top",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(communityFilteredSearch);

  // Verify community filter results are also sorted by top
  const communityResults = communityFilteredSearch.data;
  for (let i = 1; i < communityResults.length; i++) {
    const prevScore = communityResults[i - 1].post?.vote_score ?? 0;
    const currScore = communityResults[i].post?.vote_score ?? 0;
    TestValidator.predicate(
      "top sorting with community filter maintains vote_score order",
      prevScore >= currScore,
    );
  }

  // Test 3: Top sorting with minimum score filter
  const minScoreSearch = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: "TypeScript",
        page: 1,
        limit: 10,
        minScore: 1,
        sortBy: "top",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(minScoreSearch);

  // Verify all results meet minimum score and are sorted by top
  const minScoreResults = minScoreSearch.data;
  for (let i = 0; i < minScoreResults.length; i++) {
    const score = minScoreResults[i].post?.vote_score ?? 0;
    TestValidator.predicate(
      "all results meet minimum score requirement",
      score >= 1,
    );
  }

  for (let i = 1; i < minScoreResults.length; i++) {
    const prevScore = minScoreResults[i - 1].post?.vote_score ?? 0;
    const currScore = minScoreResults[i].post?.vote_score ?? 0;
    TestValidator.predicate(
      "top sorting with minScore filter maintains order",
      prevScore >= currScore,
    );
  }

  // Test 4: Verify vote_score calculation for posts with known votes
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const expectedNetVotes =
      votePatterns[i].upvoterCount - votePatterns[i].downvoterCount;

    const postResult = topResults.find((r) => r.post?.id === post.id);
    if (postResult && postResult.post) {
      TestValidator.equals(
        `post ${i} has correct vote_score`,
        postResult.post.vote_score,
        expectedNetVotes,
      );
    }
  }

  // Test 5: Pagination with top sorting preserves order
  const page1 = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: "TypeScript",
        page: 1,
        limit: 2,
        sortBy: "top",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(page1);

  if (page1.data.length >= 2) {
    const page2 = await api.functional.communityPlatform.search.index(
      connection,
      {
        body: {
          q: "TypeScript",
          page: 2,
          limit: 2,
          sortBy: "top",
        } satisfies ICommunityPlatformSearchIndex.IRequest,
      },
    );
    typia.assert(page2);

    // Verify pagination maintains sorting across pages
    if (page2.data.length > 0) {
      const page1LastScore =
        page1.data[page1.data.length - 1].post?.vote_score ?? 0;
      const page2FirstScore = page2.data[0].post?.vote_score ?? 0;
      TestValidator.predicate(
        "pagination maintains top sorting across pages",
        page1LastScore >= page2FirstScore,
      );
    }
  }

  // Test 6: Top sorting handles posts with equal vote scores
  const page1Results = page1.data;
  let foundEqualScores = false;
  for (let i = 1; i < page1Results.length; i++) {
    const prevScore = page1Results[i - 1].post?.vote_score ?? 0;
    const currScore = page1Results[i].post?.vote_score ?? 0;
    if (prevScore === currScore) {
      foundEqualScores = true;
    }
  }

  TestValidator.predicate(
    "top sorting handles equal vote scores correctly",
    foundEqualScores || page1Results.length <= 1,
  );
}
