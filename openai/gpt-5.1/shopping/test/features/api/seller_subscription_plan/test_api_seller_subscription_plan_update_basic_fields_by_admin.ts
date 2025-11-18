import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate that an authenticated admin can update mutable fields of a seller
 * subscription plan while immutable identifiers and system-managed timestamps
 * behave correctly.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) and obtains an authorized admin session.
 * 2. Admin creates a seller subscription plan with concrete commercial terms.
 * 3. Admin updates several mutable fields (name, description, price_amount,
 *    is_active) via PUT /shoppingMall/admin/sellerSubscriptionPlans/{planCode},
 *    omitting other fields to validate partial update semantics.
 * 4. The response is validated to ensure:
 *
 *    - Id and code remain unchanged (immutable identifiers)
 *    - Updated fields match the new values
 *    - Omitted fields preserve their original values
 *    - Created_at is unchanged
 *    - Updated_at has changed
 *    - Deleted_at remains null
 */
export async function test_api_seller_subscription_plan_update_basic_fields_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join (registration + initial auth)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create initial seller subscription plan
  const baseCode: string = RandomGenerator.alphaNumeric(12);

  const createBody = {
    code: baseCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 10000,
    is_active: true,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const originalPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(originalPlan);

  // 3. Plan code to be used as path parameter
  const planCode: string = originalPlan.code;

  // 4. Prepare update payload with partial fields
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedPriceAmount = originalPlan.price_amount + 5000;
  const updatedIsActive = !originalPlan.is_active;

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    price_amount: updatedPriceAmount,
    is_active: updatedIsActive,
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  const updatedPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
      connection,
      {
        planCode,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(updatedPlan);

  // 5. Assert immutable and mutable fields
  TestValidator.equals(
    "plan id should remain unchanged after update",
    updatedPlan.id,
    originalPlan.id,
  );
  TestValidator.equals(
    "plan code should remain unchanged after update",
    updatedPlan.code,
    originalPlan.code,
  );

  TestValidator.equals(
    "updated name should match update payload",
    updatedPlan.name,
    updatedName,
  );
  TestValidator.equals(
    "updated description should match update payload",
    updatedPlan.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated price_amount should match update payload",
    updatedPlan.price_amount,
    updatedPriceAmount,
  );
  TestValidator.equals(
    "updated is_active should match update payload",
    updatedPlan.is_active,
    updatedIsActive,
  );

  // Unchanged fields (omitted from update payload)
  TestValidator.equals(
    "billing_period should remain unchanged when omitted in update",
    updatedPlan.billing_period,
    originalPlan.billing_period,
  );
  TestValidator.equals(
    "currency should remain unchanged when omitted in update",
    updatedPlan.currency,
    originalPlan.currency,
  );
  TestValidator.equals(
    "effective_from should remain unchanged when omitted in update",
    updatedPlan.effective_from,
    originalPlan.effective_from,
  );
  TestValidator.equals(
    "effective_until should remain unchanged when omitted in update",
    updatedPlan.effective_until ?? null,
    originalPlan.effective_until ?? null,
  );

  // 6. Timestamp semantics
  TestValidator.equals(
    "created_at should remain unchanged after plan update",
    updatedPlan.created_at,
    originalPlan.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change after plan update",
    updatedPlan.updated_at,
    originalPlan.updated_at,
  );

  TestValidator.equals(
    "deleted_at should remain null after update",
    updatedPlan.deleted_at ?? null,
    originalPlan.deleted_at ?? null,
  );
}
