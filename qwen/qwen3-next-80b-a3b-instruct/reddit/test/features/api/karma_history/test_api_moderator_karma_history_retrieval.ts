import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaHistory";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaHistory";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_karma_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate moderator to access karma history data
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Generate multiple karma history records for different users
  // Create 5 different users to test member_id filtering
  const userIds: string[] = [];
  const karmaHistoryRecords: ICommunityBbsKarmaHistory[] = [];
  // Create 5 unique users
  for (let i = 0; i < 5; i++) {
    const userId = typia.random<string & tags.Format<"uuid">>();
    userIds.push(userId);
  }
  // Create karma history records with various deltas, reasons, and timestamps
  const now = new Date();
  const reasonTypes = [
    "upvote",
    "downvote",
    "award",
    "penalty",
    "system_adjustment",
  ];
  for (let i = 0; i < 20; i++) {
    // Randomly select a user from our list
    const userId = userIds[i % userIds.length];
    const reasonType = RandomGenerator.pick(reasonTypes);
    const previousScore = 100 + Math.floor(Math.random() * 50);
    const delta = Math.floor(Math.random() * 10) - 5; // Range: -5 to 4
    const newScore = previousScore + delta;
    // Generate a created_at timestamp from the last 30 days
    const created_at = new Date(
      now.getTime() - (30 - i) * 24 * 60 * 60 * 1000,
    ).toISOString();
    const record: ICommunityBbsKarmaHistory = {
      id: typia.random<string & tags.Format<"uuid">>(),
      user_id: userId,
      previous_score: previousScore,
      new_score: newScore,
      delta: delta,
      reason:
        reasonType +
        " " +
        RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
      created_at: created_at,
    };
    karmaHistoryRecords.push(record);
  }
  // Step 3: Test member_id filtering
  const targetUserId = userIds[0];
  const memberFiltered =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: {
          member_id: targetUserId,
        } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  typia.assert(memberFiltered);
  // Verify all records belong to target user
  for (const record of memberFiltered.data) {
    TestValidator.equals(
      "member_id filter matches",
      record.user_id,
      targetUserId,
    );
  }
  // Step 4: Test change_amount range filtering (change_amount_min and change_amount_max)
  const minDelta = -3;
  const maxDelta = 2;
  const deltaFiltered =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: {
          change_amount_min: minDelta,
          change_amount_max: maxDelta,
        } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  typia.assert(deltaFiltered);
  // Verify all records have delta within range
  for (const record of deltaFiltered.data) {
    TestValidator.predicate(
      "delta within range",
      record.delta >= minDelta && record.delta <= maxDelta,
    );
  }
  // Step 5: Test reason_type filtering
  const targetReasonType = "upvote";
  const reasonFiltered =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: {
          reason_type: targetReasonType,
        } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  typia.assert(reasonFiltered);
  // Verify all records have reason starting with target reason type
  for (const record of reasonFiltered.data) {
    TestValidator.predicate(
      "reason starts with target type",
      record.reason.startsWith(targetReasonType),
    );
  }
  // Step 6: Test created_at time range filtering
  const earlierDate = new Date(
    now.getTime() - 15 * 24 * 60 * 60 * 1000,
  ).getTime();
  const laterDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).getTime();
  const timeFiltered =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: {
          created_at_min: new Date(earlierDate).toISOString(),
          created_at_max: new Date(laterDate).toISOString(),
        } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  typia.assert(timeFiltered);
  // Verify all records fall within time range
  for (const record of timeFiltered.data) {
    const recordTime = new Date(record.created_at).getTime();
    TestValidator.predicate(
      "created_at within range",
      recordTime >= earlierDate && recordTime <= laterDate,
    );
  }
  // Step 7: Test cursor-based pagination with limit
  const query = {
    limit: 5,
    sort_order: "asc",
    sort_by: "created_at",
  } satisfies ICommunityBbsKarmaHistory.IRequest;
  // Get first page
  const firstPage =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      { body: query },
    );
  typia.assert(firstPage);
  // Verify limit of 5 records
  TestValidator.equals(
    "first page has limit of 5 records",
    firstPage.data.length,
    5,
  );
  // Use cursor to get next page
  const secondPage =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: {
          ...query,
          cursor: firstPage.data[firstPage.data.length - 1].created_at,
        },
      },
    );
  typia.assert(secondPage);
  // Verify second page has 5 records
  TestValidator.equals(
    "second page has limit of 5 records",
    secondPage.data.length,
    5,
  );
  // Verify that no records from first page appear in second page
  const firstPageCreatedAats = firstPage.data.map((r) => r.created_at);
  for (const record of secondPage.data) {
    TestValidator.predicate(
      "record not in first page",
      !firstPageCreatedAats.includes(record.created_at),
    );
  }
  // Step 8: Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination records should be at least 20",
    firstPage.pagination.records,
    karmaHistoryRecords.length,
    (key) => key !== "created_at" && key !== "id",
  );
  TestValidator.predicate(
    "pagination pages should be >= 4",
    firstPage.pagination.pages >= 4,
  );
  // Step 9: Verify karma history record structure
  for (const record of firstPage.data) {
    // Verify required fields
    TestValidator.equals("id is UUID string", typeof record.id, "string");
    TestValidator.equals(
      "user_id is UUID string",
      typeof record.user_id,
      "string",
    );
    TestValidator.equals(
      "previous_score is number",
      typeof record.previous_score,
      "number",
    );
    TestValidator.equals(
      "new_score is number",
      typeof record.new_score,
      "number",
    );
    TestValidator.equals("delta is number", typeof record.delta, "number");
    TestValidator.equals("reason is string", typeof record.reason, "string");
    TestValidator.equals(
      "created_at is ISO date string",
      typeof record.created_at,
      "string",
    );
    // Verify value constraints
    TestValidator.predicate(
      "delta is calculated correctly",
      record.new_score === record.previous_score + record.delta,
    );
    TestValidator.predicate("reason length >= 5", record.reason.length >= 5);
    // Verify format of timestamps
    TestValidator.predicate(
      "created_at matches ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.created_at),
    );
  }
  // Step 10: Test minimum limit (1)
  const minLimitQuery = {
    limit: 1,
  } satisfies ICommunityBbsKarmaHistory.IRequest;
  const minLimitResult =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      { body: minLimitQuery },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "minimum limit returns 1 record",
    minLimitResult.data.length,
    1,
  );
  // Step 11: Test maximum limit (50)
  const maxLimitQuery = {
    limit: 50,
  } satisfies ICommunityBbsKarmaHistory.IRequest;
  const maxLimitResult =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      { body: maxLimitQuery },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "maximum limit returns at most 50 records",
    maxLimitResult.data.length <= 50,
  );
  // Step 12: Test invalid limit (0) - should fail
  await TestValidator.error("limit 0 should return error", async () => {
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: { limit: 0 } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  });
  // Step 13: Test invalid limit (100) - should fail
  await TestValidator.error("limit 100 should return error", async () => {
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: { limit: 100 } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  });
  // Step 14: Test invalid change_amount_min > change_amount_max - should fail
  await TestValidator.error(
    "change_amount_min > change_amount_max should return error",
    async () => {
      await api.functional.communityBbs.moderator.karma_history.index(
        moderatorConnection,
        {
          body: {
            change_amount_min: 5,
            change_amount_max: 3,
          } satisfies ICommunityBbsKarmaHistory.IRequest,
        },
      );
    },
  );
  // Step 15: Test sort_by parameter (created_at)
  const sortByCreatedAt =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          limit: 10,
        } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  typia.assert(sortByCreatedAt);
  // Verify records are sorted by created_at ascending
  for (let i = 0; i < sortByCreatedAt.data.length - 1; i++) {
    const currentDate = new Date(sortByCreatedAt.data[i].created_at).getTime();
    const nextDate = new Date(sortByCreatedAt.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at is sorted ascending",
      currentDate <= nextDate,
    );
  }
  // Step 16: Test sort_by parameter (change_amount)
  const sortByChangeAmount =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: {
          sort_by: "change_amount",
          sort_order: "desc",
          limit: 10,
        } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  typia.assert(sortByChangeAmount);
  // Verify records are sorted by delta descending
  for (let i = 0; i < sortByChangeAmount.data.length - 1; i++) {
    const currentDelta = sortByChangeAmount.data[i].delta;
    const nextDelta = sortByChangeAmount.data[i + 1].delta;
    TestValidator.predicate(
      "delta is sorted descending",
      currentDelta >= nextDelta,
    );
  }
  // Step 17: Test multiple filter combinations
  const combinedFilter =
    await api.functional.communityBbs.moderator.karma_history.index(
      moderatorConnection,
      {
        body: {
          member_id: userIds[1],
          change_amount_min: -2,
          change_amount_max: 2,
          reason_type: "upvote",
          limit: 5,
        } satisfies ICommunityBbsKarmaHistory.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify all combined conditions are met
  for (const record of combinedFilter.data) {
    TestValidator.equals(
      "member_id filter matches",
      record.user_id,
      userIds[1],
    );
    TestValidator.predicate(
      "delta within range",
      record.delta >= -2 && record.delta <= 2,
    );
    TestValidator.predicate(
      "reason starts with upvote",
      record.reason.startsWith("upvote"),
    );
  }
}
