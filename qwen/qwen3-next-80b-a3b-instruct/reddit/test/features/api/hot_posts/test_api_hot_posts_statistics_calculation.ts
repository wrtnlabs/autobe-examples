import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_hot_posts_statistics_calculation(
  connection: api.IConnection,
) {
  // Generate 50 real post IDs
  const postIds = ArrayUtil.repeat(50, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Simulate server's filtering logic: only posts with ≥10 votes and ≤95% balance are retained
  const eligiblePostIds: string[] = [];
  const postPredictedHotScores: number[] = [];

  // Simulate 100 unique vote records across these posts
  const voteSimulations = ArrayUtil.repeat(100, () => {
    const postId = postIds[Math.floor(Math.random() * postIds.length)];
    const isUpvote = Math.random() > 0.4; // 60% chance of upvote
    return { postId, isUpvote };
  });

  // Calculate totals and ratios for each post
  const voteCounts = new Map<
    string,
    { upvotes: number; downvotes: number; totalVotes: number }
  >();

  for (const vote of voteSimulations) {
    let counts = voteCounts.get(vote.postId) || {
      upvotes: 0,
      downvotes: 0,
      totalVotes: 0,
    };
    if (vote.isUpvote) counts.upvotes++;
    else counts.downvotes++;
    counts.totalVotes++;
    voteCounts.set(vote.postId, counts);
  }

  // Determine eligible posts based on server criteria
  for (const [postId, counts] of voteCounts.entries()) {
    if (counts.totalVotes >= 10) {
      const ratio = counts.upvotes / counts.totalVotes;
      if (ratio <= 0.95) {
        eligiblePostIds.push(postId);

        // Calculate a simplified hot score based on decay
        const ageHours = Math.floor(Math.random() * 72);
        const decayFactor =
          ageHours > 24 ? Math.exp(-(ageHours - 24) / 48) : 1.0;
        const velocityWeight = 1.0 - ageHours / 72;
        const balanceWeight =
          1.0 - Math.abs(counts.upvotes - counts.downvotes) / counts.totalVotes;

        // Hot score: weighted vote count with decay and balance
        const hotScore =
          (counts.upvotes + counts.downvotes * 0.5) *
          decayFactor *
          velocityWeight *
          balanceWeight;
        postPredictedHotScores.push(hotScore);
      }
    }
  }

  // Sort eligible posts by hot score descending (simulated server-side)
  const sortedPostIds = [...eligiblePostIds].sort((a, b) => {
    const idxA = postIds.indexOf(a);
    const idxB = postIds.indexOf(b);
    if (idxA === -1 || idxB === -1) return 0;
    const scoreA = postPredictedHotScores[eligiblePostIds.indexOf(a)];
    const scoreB = postPredictedHotScores[eligiblePostIds.indexOf(b)];
    return scoreB - scoreA; // descending
  });

  // Call server API
  const response =
    await api.functional.communityPlatform.statistics.posts.hot.index(
      connection,
    );
  typia.assert(response);

  // Validate pagination
  TestValidator.equals("currentPage is 1", response.pagination.currentPage, 1);
  TestValidator.equals("limit is 25 (default)", response.pagination.limit, 25);
  TestValidator.predicate("totalRecords matches eligible posts count", () => {
    return (
      response.pagination.totalRecords >=
        Math.min(eligiblePostIds.length, 25) &&
      response.pagination.totalRecords <= eligiblePostIds.length
    );
  });
  TestValidator.equals(
    "totalPages calculated correctly",
    response.pagination.totalPages,
    Math.ceil(response.pagination.totalRecords / response.pagination.limit),
  );

  // Validate returned data are all from eligible list
  TestValidator.predicate("all returned posts are eligible", () => {
    return response.data.every((id) => eligiblePostIds.includes(id));
  });

  // Validate that responses are ordered by descending hot score
  if (response.data.length > 0) {
    let prevScore = Infinity;
    for (const postId of response.data) {
      const scoreIndex = eligiblePostIds.indexOf(postId);
      if (scoreIndex === -1) continue;
      const score = postPredictedHotScores[scoreIndex];

      // Ensure ordering: higher score first (descending)
      TestValidator.predicate(
        "posts sorted by descending hot score",
        () => score <= prevScore,
      );
      prevScore = score;
    }
  }
}
