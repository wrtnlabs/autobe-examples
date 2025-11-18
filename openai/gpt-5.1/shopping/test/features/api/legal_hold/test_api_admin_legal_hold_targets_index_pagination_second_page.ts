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

/**
 * Verify that listing legal hold targets supports correct pagination and stable
 * ordering.
 *
 * Business workflow:
 *
 * 1. Register an admin via /auth/admin/join.
 * 2. Create a legal hold via /shoppingMall/admin/legalHolds.
 * 3. Attach at least 25 legal hold targets to that legal hold.
 * 4. Fetch page 1 (limit 10) of targets via PATCH
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}/targets.
 * 5. Fetch page 2 (limit 10) with the same filters.
 * 6. Assert pagination meta fields (current, limit, records, pages).
 * 7. Assert that page 1 and page 2 contain disjoint sets of target_ids.
 * 8. Assert that repeated calls for page 1 return the same results, proving stable
 *    default ordering.
 */
export async function test_api_admin_legal_hold_targets_index_pagination_second_page(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a legal hold
  const legalHoldBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(10),
    effective_from: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  const legalHoldCode: string = legalHold.code;

  // 3. Create many legal hold targets (>=25)
  const createdTargets: IShoppingMallLegalHoldTarget[] = [];
  const targetType = "order";

  for (let i = 0; i < 25; i++) {
    const targetCreateBody = {
      target_type: targetType,
      target_id: typia.random<string & tags.Format<"uuid">>(),
      target_display: RandomGenerator.paragraph({ sentences: 2 }),
      note: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallLegalHoldTarget.ICreate;

    const created: IShoppingMallLegalHoldTarget =
      await api.functional.shoppingMall.admin.legalHolds.targets.create(
        connection,
        {
          legalHoldCode,
          body: targetCreateBody,
        },
      );
    typia.assert(created);
    createdTargets.push(created);
  }

  // 4. Fetch page 1 (page=1, limit=10)
  const requestPage1 = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const page1Result: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode,
        body: requestPage1,
      },
    );
  typia.assert(page1Result);

  const page1 = page1Result.pagination;
  const page1Targets = page1Result.data;

  // 5. Fetch page 2 (page=2, limit=10)
  const requestPage2 = {
    page: 2,
    limit: 10,
  } satisfies IShoppingMallLegalHoldTarget.IRequest;

  const page2Result: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode,
        body: requestPage2,
      },
    );
  typia.assert(page2Result);

  const page2 = page2Result.pagination;
  const page2Targets = page2Result.data;

  // 6. Pagination meta assertions
  TestValidator.equals("page 1 current page should be 1", page1.current, 1);
  TestValidator.equals("page 1 limit should be 10", page1.limit, 10);
  TestValidator.equals("page 2 current page should be 2", page2.current, 2);
  TestValidator.equals("page 2 limit should be 10", page2.limit, 10);

  TestValidator.predicate(
    "total records should be at least 25",
    page1.records >= 25,
  );
  TestValidator.predicate(
    "total pages should be at least 3 when 25+ records with limit 10",
    page1.pages >= 3,
  );

  // 7. Ensure page 1 and page 2 targets do not overlap by target_id
  const page1Ids = page1Targets.map((t) => t.target_id);
  const page2Ids = page2Targets.map((t) => t.target_id);

  TestValidator.predicate(
    "page 1 and page 2 targets must not overlap by target_id",
    page1Ids.every((id) => !page2Ids.includes(id)),
  );

  // 8. Stability of first page without explicit ordering
  const page1RepeatResult: IPageIShoppingMallLegalHoldTarget.ISummary =
    await api.functional.shoppingMall.admin.legalHolds.targets.index(
      connection,
      {
        legalHoldCode,
        body: requestPage1,
      },
    );
  typia.assert(page1RepeatResult);

  TestValidator.equals(
    "repeated page 1 pagination should match original pagination",
    page1RepeatResult.pagination,
    page1,
  );
  TestValidator.equals(
    "repeated page 1 data should match original page 1 data",
    page1RepeatResult.data,
    page1Targets,
  );

  // 9. Additional sanity checks: lengths and uniqueness across first two pages
  TestValidator.predicate(
    "page 1 should contain at most 10 records",
    page1Targets.length <= 10,
  );
  TestValidator.predicate(
    "page 2 should contain at most 10 records",
    page2Targets.length <= 10,
  );

  const combinedIds = [...page1Ids, ...page2Ids];
  const uniqueCombinedIds = Array.from(new Set(combinedIds));

  TestValidator.predicate(
    "combined first two pages should not contain duplicate target_ids",
    combinedIds.length === uniqueCombinedIds.length,
  );
}
