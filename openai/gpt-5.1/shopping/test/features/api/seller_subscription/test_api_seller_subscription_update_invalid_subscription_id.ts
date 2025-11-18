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
 * Validate that updating a seller subscription with an invalid/non-existent
 * subscriptionId fails and does not cause unintended upsert behavior.
 *
 * Business intent:
 *
 * - Admins can manage seller subscriptions via the shoppingMall admin API.
 * - When an admin attempts to update a subscription that does not exist, the
 *   system must _reject_ the request rather than silently creating or mutating
 *   some other resource.
 *
 * Scenario steps implemented here:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authorized
 *    connection context (SDK will manage Authorization headers).
 * 2. As this admin, create a valid seller subscription using POST
 *    /shoppingMall/admin/sellerSubscriptions to ensure that the system has at
 *    least one legitimate subscription.
 * 3. Generate a random UUID string that is extremely unlikely to collide with any
 *    existing subscription id.
 * 4. Build a minimal but valid IShoppingMallSellerSubscription.IUpdate payload
 *    (e.g., updating the status field only).
 * 5. Call PUT /shoppingMall/admin/sellerSubscriptions/{subscriptionId} with the
 *    random UUID and the update payload.
 * 6. Use TestValidator.error to assert that the update call throws, i.e. the
 *    backend rejects updates against non-existent subscription ids.
 * 7. As an optional control check, perform a successful update using the real
 *    subscriptionId created in step 2, proving that the endpoint accepts valid
 *    identifiers and the failure in step 6 is specific to the invalid id.
 */
export async function test_api_seller_subscription_update_invalid_subscription_id(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a valid seller subscription as a baseline existing record.
  // We don't have concrete seller or plan catalogs here, but the DTO only
  // requires UUID-format strings for foreign keys and basic scalars, so we
  // can use random UUIDs and plausible monetary values.
  const createBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    seller_subscription_plan_id: typia.random<string & tags.Format<"uuid">>(),
    status: RandomGenerator.pick(["active", "pending", "cancelled"] as const),
    started_at: new Date().toISOString(),
    ended_at: null,
    next_billing_at: null,
    currency: "USD",
    price_amount: 100,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const created: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(created);

  // 3. Generate a random UUID for a non-existent subscription id.
  const invalidSubscriptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Build a minimal valid update payload.
  const invalidUpdateBody = {
    status: "suspended",
  } satisfies IShoppingMallSellerSubscription.IUpdate;

  // 5-6. Attempt to update with the invalid id and assert that it fails.
  await TestValidator.error(
    "update with non-existent subscriptionId should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptions.update(
        connection,
        {
          subscriptionId: invalidSubscriptionId,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 7. Control check: updating the real subscriptionId should succeed with
  // a separate update payload, demonstrating that the endpoint works for
  // existing records.
  const validUpdateBody = {
    status: created.status === "active" ? "pending" : "active",
    price_amount: created.price_amount + 10,
  } satisfies IShoppingMallSellerSubscription.IUpdate;

  const updated: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.update(
      connection,
      {
        subscriptionId: created.id,
        body: validUpdateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(updated);

  // Basic sanity validations comparing before/after in-memory objects.
  TestValidator.notEquals(
    "updated subscription should differ from original after valid update",
    updated,
    created,
  );
  TestValidator.equals(
    "updated subscription id must remain stable",
    updated.id,
    created.id,
  );
}
