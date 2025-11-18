import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscriptionPlan";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Verify that filtering seller subscription plans by effective_from date window
 * returns only plans whose introduction timestamp falls inside the given
 * inclusive time range and that pagination metadata is at least consistent with
 * the number of seeded matching plans.
 *
 * Business context: Admins manage a catalog of seller subscription plans
 * (BASIC, PRO, etc.) with effective_from timestamps describing when each plan
 * becomes valid for new subscriptions. The list endpoint PATCH
 * /shoppingMall/sellerSubscriptionPlans supports filtering by an
 * effective_from_start/effective_from_end window so that admins can inspect
 * plans introduced during a particular timeframe.
 *
 * This test seeds multiple plans with known effective_from timestamps before
 * and after the window boundaries, then queries with an inclusive window and
 * validates that the seeded plans inside the window are returned, plans outside
 * the window are excluded, and pagination counts are at least large enough to
 * include all seeded matches.
 *
 * Steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to establish an administrator
 *    authorization context on the connection.
 * 2. Create five seller subscription plans via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans with effective_from values
 *    around a base `now` time:
 *
 *    - Plan A: now - 2 days (before window)
 *    - Plan B: now - 1 day (window start)
 *    - Plan C: now (inside window)
 *    - Plan D: now + 1 day (window end)
 *    - Plan E: now + 2 days (after window)
 * 3. Define an inclusive date-time window [start, end] where:
 *
 *    - Start = Plan B.effective_from
 *    - End = Plan D.effective_from This should include B, C, and D but exclude A and
 *         E.
 * 4. Call PATCH /shoppingMall/sellerSubscriptionPlans with body satisfying
 *    IShoppingMallSellerSubscriptionPlan.IRequest:
 *
 *    - Page: 1
 *    - Limit: 50 (greater than number of created plans)
 *    - Effective_from_start: start
 *    - Effective_from_end: end All other filters left null/undefined so they do not
 *         affect results.
 * 5. Assert the response type with typia.assert.
 * 6. Validate data contents:
 *
 *    - Every returned plan has effective_from defined and within the inclusive
 *         [start, end] window.
 *    - Codes for B, C, D are present; codes for A and E are absent.
 * 7. Validate pagination metadata:
 *
 *    - Pagination.current === 1
 *    - Pagination.records is at least the number of matching seeded plans.
 */
export async function test_api_seller_subscription_plans_filter_by_effective_date_window(
  connection: api.IConnection,
) {
  // 1. Join as admin to establish authorization context
  const adminJoinBody = {
    // Use typia.random to satisfy tagged formats cleanly
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

  // 2. Prepare timestamps around a base `now`
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  const effectiveFromA = new Date(now.getTime() - 2 * msPerDay).toISOString();
  const effectiveFromB = new Date(now.getTime() - 1 * msPerDay).toISOString();
  const effectiveFromC = new Date(now.getTime()).toISOString();
  const effectiveFromD = new Date(now.getTime() + 1 * msPerDay).toISOString();
  const effectiveFromE = new Date(now.getTime() + 2 * msPerDay).toISOString();

  const billingPeriod = "monthly";
  const currency = "USD";

  const codeSuffix = RandomGenerator.alphaNumeric(8);
  const codeA = `TEST_PLAN_A_${codeSuffix}`;
  const codeB = `TEST_PLAN_B_${codeSuffix}`;
  const codeC = `TEST_PLAN_C_${codeSuffix}`;
  const codeD = `TEST_PLAN_D_${codeSuffix}`;
  const codeE = `TEST_PLAN_E_${codeSuffix}`;

  const createPlan = async (
    code: string,
    name: string,
    effectiveFrom: string,
  ) => {
    const body = {
      code,
      name,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      billing_period: billingPeriod,
      currency,
      price_amount: 100,
      is_active: true,
      effective_from: effectiveFrom as string & tags.Format<"date-time">,
      effective_until: null,
    } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

    const plan: IShoppingMallSellerSubscriptionPlan =
      await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);
    return plan;
  };

  // 2. Create the five plans with controlled effective_from timestamps
  const planA = await createPlan(codeA, `Plan A ${codeSuffix}`, effectiveFromA);
  const planB = await createPlan(codeB, `Plan B ${codeSuffix}`, effectiveFromB);
  const planC = await createPlan(codeC, `Plan C ${codeSuffix}`, effectiveFromC);
  const planD = await createPlan(codeD, `Plan D ${codeSuffix}`, effectiveFromD);
  const planE = await createPlan(codeE, `Plan E ${codeSuffix}`, effectiveFromE);

  // 3. Define inclusive window [start, end]
  const windowStart = planB.effective_from;
  const windowEnd = planD.effective_from;

  // 4. Call PATCH /shoppingMall/sellerSubscriptionPlans with the date window
  const requestBody = {
    page: 1,
    limit: 50,
    search: null,
    code: null,
    name: null,
    billing_period: null,
    is_active: null,
    price_min: null,
    price_max: null,
    effective_from_start: windowStart,
    effective_from_end: windowEnd,
    sort_key: null,
    sort_order: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.IRequest;

  const pageResult: IPageIShoppingMallSellerSubscriptionPlan.ISummary =
    await api.functional.shoppingMall.sellerSubscriptionPlans.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscriptionPlan.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const data = pageResult.data;

  // 5. Validate that every returned plan falls within [windowStart, windowEnd]
  await TestValidator.predicate(
    "all returned plans have effective_from within [windowStart, windowEnd]",
    async () => {
      return data.every((summary) => {
        const ef = summary.effective_from;
        if (ef === undefined) return false;
        return ef >= windowStart && ef <= windowEnd;
      });
    },
  );

  // Build sets of codes for easier membership checks
  const returnedCodes = new Set<string>(data.map((p) => p.code));

  // Expected codes inside and outside the window
  const insideCodes = [planB.code, planC.code, planD.code];
  const outsideCodes = [planA.code, planE.code];

  // 6. Validate presence of inside-window plans
  for (const code of insideCodes) {
    TestValidator.predicate(
      `inside-window plan code ${code} should be present in results`,
      returnedCodes.has(code),
    );
  }

  // 6. Validate absence of outside-window plans
  for (const code of outsideCodes) {
    TestValidator.predicate(
      `outside-window plan code ${code} should NOT be present in results`,
      !returnedCodes.has(code),
    );
  }

  // 7. Validate pagination metadata: at least enough to cover seeded matches
  TestValidator.equals(
    "pagination.current should be page 1",
    pagination.current,
    1,
  );

  await TestValidator.predicate(
    "pagination.records should be at least number of seeded matching plans (3)",
    async () => pagination.records >= insideCodes.length,
  );

  await TestValidator.predicate(
    "pagination.pages should be at least 1",
    async () => pagination.pages >= 1,
  );
}
