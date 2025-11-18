import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate advanced filtered, ordered, and paginated listing of seller risk
 * flags for admins.
 *
 * This test exercises the admin-facing search for seller-related account risk
 * flags by performing the following high level flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Seed multiple account risk flags via POST
 *    /shoppingMall/admin/accountRiskFlags with mixed actor_type, severity, and
 *    active values, ensuring that a subset uses actor_type="seller" and a
 *    chosen severity such as "medium".
 * 3. Choose a synthetic sellerId (random UUID) to represent the seller whose risk
 *    flags we are interested in; due to missing explicit linkage APIs in this
 *    test scope, we conceptually assume that seller-related flags are those
 *    with actor_type="seller".
 * 4. Call PATCH /shoppingMall/admin/sellers/{sellerId}/accountRiskFlags with
 *    IShoppingMallAccountRiskFlag.IRequest containing:
 *
 *    - Page and limit (e.g., page=1, limit=2) to exercise pagination
 *    - Severity filter (e.g., "medium")
 *    - Active=true
 *    - Order_by="created_at" and order_direction="asc" to verify ordering
 *    - Created_from / created_to omitted in this concrete test because the
 *         timestamps are server-controlled; instead we simply validate that all
 *         returned items match the non-temporal filters.
 * 5. Assert that the response matches IPageIShoppingMallAccountRiskFlag.ISummary
 *    using typia.assert.
 * 6. Validate that:
 *
 *    - Every returned summary has actor_type === "seller"
 *    - Every returned summary has severity equal to the requested severity
 *    - Every returned summary has active === true
 *    - Items are sorted by created_at ascending
 *    - Pagination.limit equals the requested limit, data.length does not exceed the
 *         limit, and pagination.records is at least data.length.
 */
export async function test_api_admin_seller_risk_flags_list_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed multiple risk flags with mixed properties
  const severities = ["low", "medium", "high"] as const;
  const targetSeverity = "medium" as const;

  const createdFlags: IShoppingMallAccountRiskFlag[] = [];

  // Create some non-seller flags
  for (let i = 0; i < 3; i++) {
    const body = {
      actor_type: "customer",
      code: `CUST_${RandomGenerator.alphaNumeric(8)}`,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      severity: RandomGenerator.pick(severities),
      active: i % 2 === 0,
      expires_at: null,
    } satisfies IShoppingMallAccountRiskFlag.ICreate;

    const flag =
      await api.functional.shoppingMall.admin.accountRiskFlags.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallAccountRiskFlag>(flag);
    createdFlags.push(flag);
  }

  // Create seller flags, some matching the filter and some not
  const sellerFlags: IShoppingMallAccountRiskFlag[] = [];
  for (let i = 0; i < 5; i++) {
    const isMatchingSeverity = i % 2 === 0; // alternate severities
    const isActive = i % 3 !== 0; // some active, some inactive

    const body = {
      actor_type: "seller",
      code: `SELL_${RandomGenerator.alphaNumeric(8)}`,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      severity: isMatchingSeverity
        ? targetSeverity
        : RandomGenerator.pick(severities.filter((s) => s !== targetSeverity)),
      active: isActive,
      expires_at: null,
    } satisfies IShoppingMallAccountRiskFlag.ICreate;

    const flag =
      await api.functional.shoppingMall.admin.accountRiskFlags.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallAccountRiskFlag>(flag);
    createdFlags.push(flag);
    sellerFlags.push(flag);
  }

  // Compute how many seeded flags should match the query filters
  const matchingSellerFlags = sellerFlags.filter(
    (flag) => flag.severity === targetSeverity && flag.active === true,
  );
  void matchingSellerFlags;

  // 3. Choose a synthetic sellerId (random UUID)
  const syntheticSellerId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call PATCH /shoppingMall/admin/sellers/{sellerId}/accountRiskFlags with filters
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page,
    limit,
    order_by: "created_at",
    order_direction: "asc",
    actor_type: "seller",
    severity: targetSeverity,
    active: true,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const pageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.sellers.accountRiskFlags.index(
      connection,
      {
        sellerId: syntheticSellerId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(pageResult);

  const { pagination, data } = pageResult;

  // 5. Basic pagination validations
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data.length should not exceed limit",
    data.length <= pagination.limit,
  );
  TestValidator.predicate(
    "pagination.records should be at least data.length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination.current should equal requested page",
    pagination.current === page,
  );

  // 6. Validate filter conditions on returned summaries
  for (const summary of data) {
    TestValidator.equals(
      "summary.actor_type should be 'seller'",
      summary.actor_type,
      "seller",
    );
    TestValidator.equals(
      "summary.severity should equal requested severity",
      summary.severity,
      targetSeverity,
    );
    TestValidator.equals("summary.active should be true", summary.active, true);
  }

  // 7. Validate ordering by created_at ascending
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    TestValidator.predicate(
      "created_at should be in ascending order",
      new Date(prev.created_at).getTime() <=
        new Date(curr.created_at).getTime(),
    );
  }
}
