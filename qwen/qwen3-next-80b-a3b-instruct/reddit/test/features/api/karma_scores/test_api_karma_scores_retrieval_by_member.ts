import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaScore";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_karma_scores_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create karma score records for member
  // Generate multiple karma score records with different reasons and timestamps
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Create karma score records with different attributes
  const karmaScoreRecords = ArrayUtil.repeat(5, (i) => {
    const timestamp = new Date(now.getTime() - i * 1000 * 60);
    const score = RandomGenerator.pick([-2, -1, 0, 1, 2, 5, 10]);
    const reasonCategory = RandomGenerator.pick([
      "post_vote",
      "comment_vote",
      "penalty",
      "reward",
    ] as const);
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      score,
      lastUpdated: timestamp.toISOString(),
      reasonCategory,
      actorId: member.id,
    } satisfies ICommunityBbsKarmaScore.ISummary;
  });
  // Step 3: Test retrieval of own karma scores with filters
  // Test 3.1: Basic retrieval without filters
  const basicResult =
    await api.functional.communityBbs.member.karma_scores.index(
      memberConnection,
      {
        body: {} satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  typia.assert(basicResult);
  TestValidator.equals(
    "returned records match expected count",
    basicResult.data.length,
    karmaScoreRecords.length,
  );
  // Test 3.2: Filter by date range (last_updated_from)
  const fromDateResult =
    await api.functional.communityBbs.member.karma_scores.index(
      memberConnection,
      {
        body: {
          last_updated_from: threeDaysAgo.toISOString(),
        } satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  typia.assert(fromDateResult);
  // Verify that only scores from three days ago or later are returned
  const fromFilteredScores = karmaScoreRecords.filter(
    (score) => new Date(score.lastUpdated) >= threeDaysAgo,
  );
  TestValidator.equals(
    "filtered by from date",
    fromDateResult.data.length,
    fromFilteredScores.length,
  );
  // Test 3.3: Filter by date range (last_updated_to)
  const toDateResult =
    await api.functional.communityBbs.member.karma_scores.index(
      memberConnection,
      {
        body: {
          last_updated_to: oneDayAgo.toISOString(),
        } satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  typia.assert(toDateResult);
  // Verify that only scores up to one day ago are returned
  const toFilteredScores = karmaScoreRecords.filter(
    (score) => new Date(score.lastUpdated) <= oneDayAgo,
  );
  TestValidator.equals(
    "filtered by to date",
    toDateResult.data.length,
    toFilteredScores.length,
  );
  // Test 3.4: Filter by score range
  const scoreFromResult =
    await api.functional.communityBbs.member.karma_scores.index(
      memberConnection,
      {
        body: {
          score_from: 5,
        } satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  typia.assert(scoreFromResult);
  const scoreFromFiltered = karmaScoreRecords.filter(
    (score) => score.score >= 5,
  );
  TestValidator.equals(
    "filtered by score from",
    scoreFromResult.data.length,
    scoreFromFiltered.length,
  );
  const scoreToResult =
    await api.functional.communityBbs.member.karma_scores.index(
      memberConnection,
      {
        body: {
          score_to: -1,
        } satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  typia.assert(scoreToResult);
  const scoreToFiltered = karmaScoreRecords.filter(
    (score) => score.score <= -1,
  );
  TestValidator.equals(
    "filtered by score to",
    scoreToResult.data.length,
    scoreToFiltered.length,
  );
  // Test 3.6: Chain multiple filters - Removed reason_category as it's not a valid property
  const combinedResult =
    await api.functional.communityBbs.member.karma_scores.index(
      memberConnection,
      {
        body: {
          last_updated_from: threeDaysAgo.toISOString(),
          score_from: 0,
        } satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify combined filters apply properly
  const combinedFiltered = karmaScoreRecords.filter(
    (score) => new Date(score.lastUpdated) >= threeDaysAgo && score.score >= 0,
  );
  TestValidator.equals(
    "combined filters",
    combinedResult.data.length,
    combinedFiltered.length,
  );
  // Test 3.7: Pagination
  const limit2Result =
    await api.functional.communityBbs.member.karma_scores.index(
      memberConnection,
      {
        body: {
          limit: 2,
        } satisfies ICommunityBbsKarmaScore.IRequest,
      },
    );
  typia.assert(limit2Result);
  TestValidator.equals("pagination limit 2", limit2Result.data.length, 2);
  TestValidator.equals(
    "pagination records",
    limit2Result.pagination.records,
    karmaScoreRecords.length,
  );
  TestValidator.equals(
    "pagination pages",
    limit2Result.pagination.pages,
    Math.ceil(karmaScoreRecords.length / 2),
  );
  // Test 3.8: Test cursor-based pagination (page token)
  // Since pagination is cursor-based, we need to get the first page, then use its page token
  const firstPage = await api.functional.communityBbs.member.karma_scores.index(
    memberConnection,
    {
      body: {
        limit: 1,
      } satisfies ICommunityBbsKarmaScore.IRequest,
    },
  );
  typia.assert(firstPage);
  // Use the page token from firstPage to get second page
  if (
    firstPage.pagination.pages !== undefined &&
    firstPage.pagination.pages !== null
  ) {
    const secondPage =
      await api.functional.communityBbs.member.karma_scores.index(
        memberConnection,
        {
          body: {
            // Convert number to string safely using typia.assert
            page: typia.assert<string>(firstPage.pagination.pages),
          } satisfies ICommunityBbsKarmaScore.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.predicate("second page exists", secondPage.data.length > 0);
  }
  // Step 4: Verify access control - member cannot view other user's karma scores
  // Create a new member to act as another user
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(otherMember);
  // Try to retrieve other member's karma scores as the original member - should fail
  await TestValidator.error(
    "cannot view other user's karma scores",
    async () => {
      await api.functional.communityBbs.member.karma_scores.index(
        memberConnection,
        {
          body: {
            user_id: otherMember.id,
          } satisfies ICommunityBbsKarmaScore.IRequest,
        },
      );
    },
  );
}
