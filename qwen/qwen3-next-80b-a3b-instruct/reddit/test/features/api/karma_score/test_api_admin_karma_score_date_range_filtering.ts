import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaScore";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_karma_score_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(adminAuth);
  // Step 2: Generate test karma scores with varied timestamps
  // We'll create scores at different times to verify date filtering
  const testScores: ICommunityBbsKarmaScore.ISummary[] = [];
  // Current date for reference
  const now = new Date();
  // Create a score 7 days ago (before range)
  const oldDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oldScore: ICommunityBbsKarmaScore.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    score: 150,
    lastUpdated: oldDate.toISOString(),
    reasonCategory: "post_vote",
    actorId: typia.random<string & tags.Format<"uuid">>(),
  };
  testScores.push(oldScore);
  // Create a score 3 days ago (within range)
  const midDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const midScore: ICommunityBbsKarmaScore.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    score: 200,
    lastUpdated: midDate.toISOString(),
    reasonCategory: "comment_vote",
    actorId: typia.random<string & tags.Format<"uuid">>(),
  };
  testScores.push(midScore);
  // Create a score 1 day ago (within range)
  const recentDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const recentScore: ICommunityBbsKarmaScore.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    score: 250,
    lastUpdated: recentDate.toISOString(),
    reasonCategory: "reward",
    actorId: typia.random<string & tags.Format<"uuid">>(),
  };
  testScores.push(recentScore);
  // Create a score 30 minutes ago (within range)
  const veryRecentDate = new Date(now.getTime() - 30 * 60 * 1000);
  const veryRecentScore: ICommunityBbsKarmaScore.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    score: 300,
    lastUpdated: veryRecentDate.toISOString(),
    reasonCategory: "penalty",
    actorId: typia.random<string & tags.Format<"uuid">>(),
  };
  testScores.push(veryRecentScore);
  // Create a score 10 days ago (before range)
  const ancientDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const ancientScore: ICommunityBbsKarmaScore.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    score: 50,
    lastUpdated: ancientDate.toISOString(),
    reasonCategory: "post_vote",
    actorId: typia.random<string & tags.Format<"uuid">>(),
  };
  testScores.push(ancientScore);
  // Step 3: Query with a date range (3 days ago to now)
  // last_updated_from: 3 days ago
  // last_updated_to: now
  const startDate = midDate.toISOString(); // 3 days ago
  const endDate = now.toISOString(); // now
  const response = await api.functional.communityBbs.admin.karma_scores.index(
    adminConnection,
    {
      body: {
        last_updated_from: startDate,
        last_updated_to: endDate,
      } satisfies ICommunityBbsKarmaScore.IRequest,
    },
  );
  typia.assert(response);
  // Step 4: Validate results
  // All returned scores should be within the date range
  // The two oldest scores (7 days and 10 days ago) should be excluded
  // The three most recent scores (3 days ago, 1 day ago, 30 minutes ago) should be included
  // Verify pagination
  TestValidator.equals(
    "pagination - current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination - limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination - records >= 3",
    response.pagination.records >= 3,
  );
  // Verify data contains exactly the scores within our date range
  TestValidator.equals("data length", response.data.length, 3);
  // Check the returned data matches our expected scores within range
  // We can't check IDs since they're random, but we can verify timestamps and counts
  const returnedDates = response.data.map((item) => new Date(item.lastUpdated));
  // All returned dates should be >= startDate (3 days ago)
  TestValidator.predicate(
    "all returned dates >= start date",
    returnedDates.every((date) => date >= new Date(startDate)),
  );
  // All returned dates should be <= endDate (now)
  TestValidator.predicate(
    "all returned dates <= end date",
    returnedDates.every((date) => date <= new Date(endDate)),
  );
  // Verify that reason categories and scores are correctly returned
  TestValidator.predicate(
    "all returned items have a reason category",
    response.data.every(
      (item) =>
        typeof item.reasonCategory === "string" &&
        item.reasonCategory.length > 0,
    ),
  );
  TestValidator.predicate(
    "all returned items have positive scores",
    response.data.every((item) => item.score >= 0),
  );
  // Removed manual UUID validation because typia.assert() already validates UUID format
  // No need for regex pattern test - typia.assert() handles format validation
}
