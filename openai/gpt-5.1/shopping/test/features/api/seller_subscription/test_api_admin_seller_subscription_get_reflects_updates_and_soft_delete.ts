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

export async function test_api_admin_seller_subscription_get_reflects_updates_and_soft_delete(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization context (token auto-attached by SDK)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Create a seller subscription plan for the subscription to reference
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const effectiveFrom = new Date(now.getTime() - thirtyDaysMs).toISOString();

  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: RandomGenerator.pick(["monthly", "yearly"] as const),
    currency: "USD",
    price_amount: 99.99,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planCreateBody },
    );
  typia.assert(plan);

  // 3. Create an initial seller subscription (admin-level create ensures seller_id is valid)
  const startedAt = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const nextBillingAtInitial = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const subscriptionCreateBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt,
    ended_at: null,
    next_billing_at: nextBillingAtInitial,
    currency: plan.currency as string & tags.MinLength<1>,
    price_amount: plan.price_amount,
    discount_amount: 10,
    metadata_json: JSON.stringify({ tier: "gold", source: "e2e" }),
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const created: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(created);

  // 4. Initial GET to verify creation state
  const fetchedInitial: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.at(connection, {
      subscriptionId: created.id,
    });
  typia.assert(fetchedInitial);

  TestValidator.equals(
    "created vs fetched (id)",
    fetchedInitial.id,
    created.id,
  );
  TestValidator.equals(
    "created vs fetched (seller_id)",
    fetchedInitial.seller_id,
    created.seller_id,
  );
  TestValidator.equals(
    "created vs fetched (plan id)",
    fetchedInitial.seller_subscription_plan_id,
    created.seller_subscription_plan_id,
  );
  TestValidator.equals(
    "created vs fetched (status)",
    fetchedInitial.status,
    created.status,
  );
  TestValidator.equals(
    "created vs fetched (started_at)",
    fetchedInitial.started_at,
    created.started_at,
  );
  TestValidator.equals(
    "created vs fetched (ended_at)",
    fetchedInitial.ended_at,
    created.ended_at ?? null,
  );
  TestValidator.equals(
    "created vs fetched (next_billing_at)",
    fetchedInitial.next_billing_at,
    created.next_billing_at ?? null,
  );
  TestValidator.equals(
    "created vs fetched (currency)",
    fetchedInitial.currency,
    created.currency,
  );
  TestValidator.equals(
    "created vs fetched (price_amount)",
    fetchedInitial.price_amount,
    created.price_amount,
  );
  TestValidator.equals(
    "created vs fetched (discount_amount)",
    fetchedInitial.discount_amount,
    created.discount_amount,
  );
  TestValidator.equals(
    "created vs fetched (metadata_json)",
    fetchedInitial.metadata_json ?? null,
    created.metadata_json ?? null,
  );

  TestValidator.equals(
    "deleted_at should be null right after creation",
    fetchedInitial.deleted_at ?? null,
    null,
  );

  // 5. Update mutable fields via PUT
  const nextBillingAtUpdated = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    status: "cancelled",
    discount_amount: 5,
    next_billing_at: nextBillingAtUpdated,
    metadata_json: JSON.stringify({ tier: "silver", source: "e2e-update" }),
  } satisfies IShoppingMallSellerSubscription.IUpdate;

  const updated: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.update(
      connection,
      {
        subscriptionId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 6. GET again and verify updated fields are reflected, others stable
  const fetchedAfterUpdate: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.at(connection, {
      subscriptionId: created.id,
    });
  typia.assert(fetchedAfterUpdate);

  TestValidator.equals(
    "id should remain unchanged after update",
    fetchedAfterUpdate.id,
    created.id,
  );
  TestValidator.equals(
    "seller_id should remain unchanged after update",
    fetchedAfterUpdate.seller_id,
    created.seller_id,
  );
  TestValidator.equals(
    "plan id should remain unchanged after update",
    fetchedAfterUpdate.seller_subscription_plan_id,
    created.seller_subscription_plan_id,
  );
  TestValidator.equals(
    "status should reflect updated value",
    fetchedAfterUpdate.status,
    updateBody.status,
  );
  TestValidator.equals(
    "discount_amount should reflect updated value",
    fetchedAfterUpdate.discount_amount,
    updateBody.discount_amount,
  );
  TestValidator.equals(
    "next_billing_at should reflect updated value",
    fetchedAfterUpdate.next_billing_at,
    updateBody.next_billing_at ?? null,
  );
  TestValidator.equals(
    "metadata_json should reflect updated value",
    fetchedAfterUpdate.metadata_json ?? null,
    updateBody.metadata_json ?? null,
  );

  TestValidator.equals(
    "started_at should remain from creation after update",
    fetchedAfterUpdate.started_at,
    created.started_at,
  );
  TestValidator.equals(
    "currency should remain from creation after update",
    fetchedAfterUpdate.currency,
    created.currency,
  );
  TestValidator.equals(
    "price_amount should remain from creation after update",
    fetchedAfterUpdate.price_amount,
    created.price_amount,
  );

  TestValidator.predicate(
    "updated_at should be equal or later than initial fetched updated_at",
    new Date(fetchedAfterUpdate.updated_at).getTime() >=
      new Date(fetchedInitial.updated_at).getTime(),
  );

  // 7. DELETE (hard delete) the subscription
  await api.functional.shoppingMall.admin.sellerSubscriptions.erase(
    connection,
    {
      subscriptionId: created.id,
    },
  );

  // 8. GET after delete should result in error (e.g., not found). We only assert that an error occurs.
  await TestValidator.error("GET after erase should fail", async () => {
    await api.functional.shoppingMall.admin.sellerSubscriptions.at(connection, {
      subscriptionId: created.id,
    });
  });
}
