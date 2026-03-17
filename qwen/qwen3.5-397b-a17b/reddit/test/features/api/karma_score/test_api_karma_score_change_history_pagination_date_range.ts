import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarmaScoreChange";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScoreChange";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test karma score change history pagination and date range filtering.
 * 1. Authenticate member A (karma score owner)
 * 2. Create community for posting
 * 3. Member A creates 8 posts to generate sufficient karma events
 * 4. Authenticate 4 voters (B, C, D, E)
 * 5. Each voter votes on all posts generating 32 karma changes
 * 6. Retrieve member A's karma score ID
 * 7. Query karma changes with pagination (page=1, limit=10)
 * 8. Query with date range filter (created_at_from)
 * 9. Validate pagination metadata and change data
 */
export async function test_api_karma_score_change_history_pagination_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member A (karma score owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Member A creates 8 posts
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < 8; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "TEXT",
          community_id: community.id,
          text: {
            body: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IRedditClonePostText.ICreate,
        } satisfies IRedditClonePost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Authenticate 4 voters (B, C, D, E)
  const voterConnections: api.IConnection[] = [];
  const voters: IRedditCloneMember.IAuthorized[] = [];
  for (let i = 0; i < 4; i++) {
    const voterConnection: api.IConnection = { host: connection.host };
    const voter = await authorize_member_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
    typia.assert(voter);
    voterConnections.push(voterConnection);
    voters.push(voter);
  }
  // 5. Each voter votes on all posts (4 voters × 8 posts = 32 karma changes)
  const voteTypes: ("UPVOTE" | "DOWNVOTE")[] = ["UPVOTE", "DOWNVOTE"] as const;
  for (const voterConnection of voterConnections) {
    for (const post of posts) {
      const voteType = RandomGenerator.pick(voteTypes);
      const vote = await generate_random_reddit_clone_member_posts_vote(
        voterConnection,
        {
          params: { postId: post.id },
          body: {
            vote_type: voteType satisfies "UPVOTE" | "DOWNVOTE" as
              | "UPVOTE"
              | "DOWNVOTE",
          } satisfies IRedditClonePostVote.ICreate,
        },
      );
      typia.assert(vote);
    }
  }
  // 6. Retrieve member A's karma score
  const karmaScore = await api.functional.redditClone.karma_scores.at(
    memberAConnection,
    {
      memberId: memberA.id,
    },
  );
  typia.assert(karmaScore);
  // 7. Query karma changes with pagination (page=1, limit=10)
  const paginationResult =
    await api.functional.redditClone.karma_scores.changes.index(
      memberAConnection,
      {
        karmaScoreId: karmaScore.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at:desc",
        } satisfies IRedditCloneKarmaScoreChange.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals("current page", paginationResult.pagination.current, 1);
  TestValidator.equals("limit", paginationResult.pagination.limit, 10);
  TestValidator.predicate(
    "records >= 25",
    paginationResult.pagination.records >= 25,
  );
  TestValidator.predicate("pages >= 3", paginationResult.pagination.pages >= 3);
  // Validate change data count
  TestValidator.equals(
    "first page has 10 items",
    paginationResult.data.length,
    10,
  );
  // Validate ordering by created_at descending
  if (paginationResult.data.length > 1) {
    const firstTimestamp = new Date(
      paginationResult.data[0].created_at,
    ).getTime();
    const secondTimestamp = new Date(
      paginationResult.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "ordered by created_at descending",
      firstTimestamp >= secondTimestamp,
    );
  }
  // Validate change_amount includes both positive and negative values
  const hasUpvote = paginationResult.data.some(
    (change) => change.change_amount > 0,
  );
  const hasDownvote = paginationResult.data.some(
    (change) => change.change_amount < 0,
  );
  TestValidator.predicate("has upvote changes", hasUpvote);
  TestValidator.predicate("has downvote changes", hasDownvote);
  // 8. Query with date range filter (created_at_from to exclude older changes)
  const lastChangeOnPage =
    paginationResult.data[paginationResult.data.length - 1];
  const dateRangeResult =
    await api.functional.redditClone.karma_scores.changes.index(
      memberAConnection,
      {
        karmaScoreId: karmaScore.id,
        body: {
          page: 1,
          limit: 10,
          created_at_from: lastChangeOnPage.created_at,
          sort: "created_at:desc",
        } satisfies IRedditCloneKarmaScoreChange.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate date range filtering returns fewer or equal records
  TestValidator.predicate(
    "date range filters records",
    dateRangeResult.pagination.records <= paginationResult.pagination.records,
  );
  TestValidator.predicate(
    "date range has data",
    dateRangeResult.data.length > 0,
  );
  // Validate that date range result also has proper ordering
  if (dateRangeResult.data.length > 1) {
    const firstTimestamp = new Date(
      dateRangeResult.data[0].created_at,
    ).getTime();
    const secondTimestamp = new Date(
      dateRangeResult.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "date range ordered descending",
      firstTimestamp >= secondTimestamp,
    );
  }
}