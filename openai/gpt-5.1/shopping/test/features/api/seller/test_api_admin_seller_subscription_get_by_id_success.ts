import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscription";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate that an admin can fetch a specific seller subscription by ID and
 * that the returned record matches the state at creation time.
 *
 * Business context:
 *
 * - Admin actors manage seller subscription plans and individual subscriptions.
 * - Once a subscription is created for a seller, the admin should be able to
 *   retrieve it by its unique id and see consistent core fields such as
 *   seller_id, seller_subscription_plan_id, status, timing fields, pricing
 *   amounts, and soft-delete metadata.
 *
 * Test flow:
 *
 * 1. Register an admin using POST /auth/admin/join so that subsequent
 *    shoppingMall.admin.* operations are authorized. The join endpoint will
 *    automatically attach the access token to the connection headers.
 * 2. Create a seller subscription plan via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans using
 *    IShoppingMallSellerSubscriptionPlan.ICreate with deterministic values for
 *    code, billing_period, currency, price_amount, is_active, and
 *    effective_from/effective_until.
 * 3. Create a seller subscription via POST /shoppingMall/admin/sellerSubscriptions
 *    using IShoppingMallSellerSubscription.ICreate. For seller_id, use the id
 *    from the seller summary embedded in the subscription response itself (the
 *    backend must accept the value we send, but from the test perspective, we
 *    only need the value to be a valid UUID). The seller_subscription_plan_id
 *    must be the id of the plan created in step 2. Provide explicit values for
 *    status, started_at, optional ended_at and next_billing_at, currency,
 *    price_amount, discount_amount, and metadata_json.
 * 4. Call GET /shoppingMall/admin/sellerSubscriptions/{subscriptionId} using
 *    api.functional.shoppingMall.admin.sellerSubscriptions.at with the id from
 *    the creation response.
 * 5. Validate that:
 *
 *    - The response type matches IShoppingMallSellerSubscription (via typia.assert).
 *    - Core scalar fields of the retrieved subscription match those from the
 *         creation response: seller_id, seller_subscription_plan_id, status,
 *         started_at, ended_at, next_billing_at, currency, price_amount,
 *         discount_amount, metadata_json.
 *    - Deleted_at is null/undefined immediately after creation (i.e., the
 *         subscription is not soft-deleted).
 *    - If seller and plan summary objects are present, their id fields match
 *         seller_id and seller_subscription_plan_id respectively.
 */
export async function test_api_admin_seller_subscription_get_by_id_success(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create seller subscription plan with deterministic but random-ish values
  const now = new Date();
  const effectiveFrom = now.toISOString() as string & tags.Format<"date-time">;
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const planBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: "E2E Test Plan",
    description: "Plan created by E2E test for seller subscription at-by-id.",
    billing_period: "monthly",
    currency: "USD",
    price_amount: 99.99,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planBody },
    );
  typia.assert(createdPlan);

  // 3. Create seller subscription
  // For seller_id, generate a fresh UUID; the test only needs internal
  // consistency and type correctness.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const subscriptionStartedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const subscriptionEndedAt = null as
    | (string & tags.Format<"date-time">)
    | null;
  const nextBillingAt = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const subscriptionBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: createdPlan.id,
    status: "active",
    started_at: subscriptionStartedAt,
    ended_at: subscriptionEndedAt,
    next_billing_at: nextBillingAt,
    currency: createdPlan.currency as string & tags.MinLength<1>,
    price_amount: createdPlan.price_amount,
    discount_amount: 10,
    metadata_json: JSON.stringify({ source: "e2e-test", note: "initial" }),
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const createdSubscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert(createdSubscription);

  // 4. Retrieve subscription by ID
  const fetchedSubscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.at(connection, {
      subscriptionId: createdSubscription.id,
    });
  typia.assert(fetchedSubscription);

  // 5. Validate core fields match between created and fetched records
  TestValidator.equals(
    "seller_id must match between created and fetched subscription",
    fetchedSubscription.seller_id,
    createdSubscription.seller_id,
  );

  TestValidator.equals(
    "seller_subscription_plan_id must match between created and fetched subscription",
    fetchedSubscription.seller_subscription_plan_id,
    createdSubscription.seller_subscription_plan_id,
  );

  TestValidator.equals(
    "status must match between created and fetched subscription",
    fetchedSubscription.status,
    createdSubscription.status,
  );

  TestValidator.equals(
    "started_at must match between created and fetched subscription",
    fetchedSubscription.started_at,
    createdSubscription.started_at,
  );

  TestValidator.equals(
    "ended_at must match between created and fetched subscription",
    fetchedSubscription.ended_at ?? null,
    createdSubscription.ended_at ?? null,
  );

  TestValidator.equals(
    "next_billing_at must match between created and fetched subscription",
    fetchedSubscription.next_billing_at ?? null,
    createdSubscription.next_billing_at ?? null,
  );

  TestValidator.equals(
    "currency must match between created and fetched subscription",
    fetchedSubscription.currency,
    createdSubscription.currency,
  );

  TestValidator.equals(
    "price_amount must match between created and fetched subscription",
    fetchedSubscription.price_amount,
    createdSubscription.price_amount,
  );

  TestValidator.equals(
    "discount_amount must match between created and fetched subscription",
    fetchedSubscription.discount_amount,
    createdSubscription.discount_amount,
  );

  TestValidator.equals(
    "metadata_json must match between created and fetched subscription",
    fetchedSubscription.metadata_json ?? null,
    createdSubscription.metadata_json ?? null,
  );

  // deleted_at should be null/undefined for a freshly created active subscription
  TestValidator.equals(
    "deleted_at should be null or undefined right after creation",
    fetchedSubscription.deleted_at ?? null,
    null,
  );

  // If seller summary is present, its id must match seller_id
  if (fetchedSubscription.seller) {
    TestValidator.equals(
      "seller summary id must match seller_id",
      fetchedSubscription.seller.id,
      fetchedSubscription.seller_id,
    );
  }

  // If plan summary is present, its id must match seller_subscription_plan_id
  if (fetchedSubscription.plan) {
    TestValidator.equals(
      "plan summary id must match seller_subscription_plan_id",
      fetchedSubscription.plan.id,
      fetchedSubscription.seller_subscription_plan_id,
    );
  }
}
