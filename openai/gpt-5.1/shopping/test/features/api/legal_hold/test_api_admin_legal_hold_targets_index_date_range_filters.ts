import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHoldTarget";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

export async function test_api_admin_legal_hold_targets_index_date_range_filters(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorized context
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create a legal hold
  const legalHoldCreateBody = {
    code: `LH-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
    status: "active",
    scope_description: null,
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(legalHold);

  const legalHoldCode: string = legalHold.code;

  // 3. Create two targets at different times
  // Target A
  const targetABody = {
    target_type: "customer",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.paragraph({ sentences: 2 }),
    note: "Target A for date range test",
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const targetA: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode,
        body: targetABody,
      },
    );
  typia.assert(targetA);

  const targetACreatedAt: string & tags.Format<"date-time"> =
    targetA.created_at;

  // Spin-wait to ensure a measurable created_at difference for Target B
  const waitStart = Date.now();
  while (Date.now() - waitStart < 50) {
    // busy wait ~50ms
  }

  // Target B
  const targetBBody = {
    target_type: "customer",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    target_display: RandomGenerator.paragraph({ sentences: 2 }),
    note: "Target B for date range test",
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const targetB: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode,
        body: targetBBody,
      },
    );
  typia.assert(targetB);

  const targetBCreatedAt: string & tags.Format<"date-time"> =
    targetB.created_at;

  // 4. Baseline index call with broad filters (page=1, limit=10, all filters null)
  const baselineRequestBody = {
    page: 1,
    limit: 10,
    target_type: null,
    target_id: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const baselinePage: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode,
        body: baselineRequestBody,
      },
    );
  typia.assert(baselinePage);

  const baselineData = baselinePage.data;

  const summaryA = baselineData.find(
    (row) => row.target_id === targetA.target_id,
  );
  const summaryB = baselineData.find(
    (row) => row.target_id === targetB.target_id,
  );

  TestValidator.predicate(
    "baseline list should include Target A",
    summaryA !== undefined,
  );
  TestValidator.predicate(
    "baseline list should include Target B",
    summaryB !== undefined,
  );

  if (summaryA === undefined || summaryB === undefined) {
    // If either target is not in the first page, further date-range checks
    // would be unreliable, so exit early.
    return;
  }

  // 5. Build a created_from/created_to window between A and B
  const aDate = new Date(targetACreatedAt);
  const bDate = new Date(targetBCreatedAt);

  const midMillis = (aDate.getTime() + bDate.getTime()) / 2;
  const midDate = new Date(midMillis);
  const midIso = midDate.toISOString();
  const afterBMillis = bDate.getTime() + 1;
  const afterBDate = new Date(afterBMillis);
  const afterBIso = afterBDate.toISOString();

  // 6. Filtered index: created_from = midIso, created_to = afterBIso
  const rangedRequestBody = {
    page: 1,
    limit: 10,
    target_type: null,
    target_id: null,
    created_from: midIso,
    created_to: afterBIso,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const rangedPage: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode,
        body: rangedRequestBody,
      },
    );
  typia.assert(rangedPage);

  const rangedIds = rangedPage.data.map((row) => row.target_id);

  TestValidator.predicate(
    "date-range filter should include Target B",
    rangedIds.includes(targetB.target_id),
  );
  TestValidator.predicate(
    "date-range filter should exclude Target A",
    !rangedIds.includes(targetA.target_id),
  );

  // 7. Optional scenario: created_to only, between A and B
  const upperOnlyRequestBody = {
    page: 1,
    limit: 10,
    target_type: null,
    target_id: null,
    created_from: null,
    created_to: midIso,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const upperOnlyPage: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode,
        body: upperOnlyRequestBody,
      },
    );
  typia.assert(upperOnlyPage);

  const upperOnlyIds = upperOnlyPage.data.map((row) => row.target_id);

  TestValidator.predicate(
    "upper-bound-only filter should include Target A",
    upperOnlyIds.includes(targetA.target_id),
  );
  TestValidator.predicate(
    "upper-bound-only filter should exclude Target B",
    !upperOnlyIds.includes(targetB.target_id),
  );
}
