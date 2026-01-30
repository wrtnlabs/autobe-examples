import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_history_admin_filter_by_change_amount(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate test karma history records with varied delta values
  // Create records with positive, negative, and zero delta values
  const karmaRecords = ArrayUtil.repeat(10, (index) => {
    const hasPositiveDelta = index < 4;
    const hasNegativeDelta = index >= 4 && index < 7;
    const hasZeroDelta = index >= 7;
    const previousScore = randint(100, 1000);
    const newScore = hasPositiveDelta
      ? previousScore + randint(1, 50) // Positive delta: +1 to +50
      : hasNegativeDelta
        ? previousScore - randint(1, 50) // Negative delta: -1 to -50
        : previousScore; // Zero delta
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      user_id: typia.random<string & tags.Format<"uuid">>(),
      previous_score: previousScore,
      new_score: newScore,
      delta: newScore - previousScore,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      created_at: new Date().toISOString(),
    } satisfies ICommunityBbsKarmaHistory;
  });
  // Step 3: Extract delta values for testing
  const deltas = karmaRecords.map((record) => record.delta);
  const minDelta = Math.min(...deltas);
  const maxDelta = Math.max(...deltas);
  // Step 4: Test filtering with different ranges
  // Test 1: Filter for positive deltas only (change_amount_min > 0)
  const positiveFilter: ICommunityBbsKarmaHistory.IRequest = {
    change_amount_min: 1,
  };
  const positiveResult: IPageICommunityBbsKarmaHistory =
    await api.functional.communityBbs.admin.karma_history.index(
      adminConnection,
      {
        body: positiveFilter,
      },
    );
  typia.assert(positiveResult);
  // Validate: All returned records should have delta > 0
  positiveResult.data.forEach((record) => {
    TestValidator.predicate("positive delta only", record.delta > 0);
  });
  // Validate: No records with delta <= 0 should be present
  TestValidator.equals(
    "positive filter records count",
    positiveResult.data.length,
    karmaRecords.filter((r) => r.delta > 0).length,
  );
  // Test 2: Filter for negative deltas only (change_amount_max < 0)
  const negativeFilter: ICommunityBbsKarmaHistory.IRequest = {
    change_amount_max: -1,
  };
  const negativeResult: IPageICommunityBbsKarmaHistory =
    await api.functional.communityBbs.admin.karma_history.index(
      adminConnection,
      {
        body: negativeFilter,
      },
    );
  typia.assert(negativeResult);
  // Validate: All returned records should have delta < 0
  negativeResult.data.forEach((record) => {
    TestValidator.predicate("negative delta only", record.delta < 0);
  });
  // Validate: No records with delta >= 0 should be present
  TestValidator.equals(
    "negative filter records count",
    negativeResult.data.length,
    karmaRecords.filter((r) => r.delta < 0).length,
  );
  // Test 3: Filter for range including negative and positive (change_amount_min < 0, change_amount_max > 0)
  const rangeFilter: ICommunityBbsKarmaHistory.IRequest = {
    change_amount_min: -10,
    change_amount_max: 10,
  };
  const rangeResult: IPageICommunityBbsKarmaHistory =
    await api.functional.communityBbs.admin.karma_history.index(
      adminConnection,
      {
        body: rangeFilter,
      },
    );
  typia.assert(rangeResult);
  // Validate: All returned records should have delta between -10 and 10 (inclusive)
  rangeResult.data.forEach((record) => {
    TestValidator.predicate(
      "delta within range",
      record.delta >= -10 && record.delta <= 10,
    );
  });
  // Validate: Matches expected count
  TestValidator.equals(
    "range filter records count",
    rangeResult.data.length,
    karmaRecords.filter((r) => r.delta >= -10 && r.delta <= 10).length,
  );
  // Test 4: Filter for exact zero delta only
  const zeroFilter: ICommunityBbsKarmaHistory.IRequest = {
    change_amount_min: 0,
    change_amount_max: 0,
  };
  const zeroResult: IPageICommunityBbsKarmaHistory =
    await api.functional.communityBbs.admin.karma_history.index(
      adminConnection,
      {
        body: zeroFilter,
      },
    );
  typia.assert(zeroResult);
  // Validate: Only records with exact delta of 0 should be returned
  zeroResult.data.forEach((record) => {
    TestValidator.equals("zero delta", record.delta, 0);
  });
  // Validate: Matches exact count of zero-delta records
  TestValidator.equals(
    "zero filter records count",
    zeroResult.data.length,
    karmaRecords.filter((r) => r.delta === 0).length,
  );
  // Test 5: Filter with change_amount_min only (should return delta >= min)
  const minFilter: ICommunityBbsKarmaHistory.IRequest = {
    change_amount_min: minDelta,
  };
  const minResult: IPageICommunityBbsKarmaHistory =
    await api.functional.communityBbs.admin.karma_history.index(
      adminConnection,
      {
        body: minFilter,
      },
    );
  typia.assert(minResult);
  // Validate: All returned records should have delta >= minDelta
  minResult.data.forEach((record) => {
    TestValidator.predicate("delta >= minimum", record.delta >= minDelta);
  });
  // Validate: Matches count of records above minimum
  TestValidator.equals(
    "min filter records count",
    minResult.data.length,
    karmaRecords.filter((r) => r.delta >= minDelta).length,
  );
  // Test 6: Filter with change_amount_max only (should return delta <= max)
  const maxFilter: ICommunityBbsKarmaHistory.IRequest = {
    change_amount_max: maxDelta,
  };
  const maxResult: IPageICommunityBbsKarmaHistory =
    await api.functional.communityBbs.admin.karma_history.index(
      adminConnection,
      {
        body: maxFilter,
      },
    );
  typia.assert(maxResult);
  // Validate: All returned records should have delta <= maxDelta
  maxResult.data.forEach((record) => {
    TestValidator.predicate("delta <= maximum", record.delta <= maxDelta);
  });
  // Validate: Matches count of records below maximum
  TestValidator.equals(
    "max filter records count",
    maxResult.data.length,
    karmaRecords.filter((r) => r.delta <= maxDelta).length,
  );
}