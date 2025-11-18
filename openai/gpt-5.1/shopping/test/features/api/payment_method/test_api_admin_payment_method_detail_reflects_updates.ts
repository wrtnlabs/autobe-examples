import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate that admin payment method detail reflects updates.
 *
 * Business flow:
 *
 * 1. Register and authenticate an admin via POST /auth/admin/join.
 * 2. Create a payment method via POST /shoppingMall/admin/paymentMethods with
 *    explicit initial configuration values.
 * 3. Fetch the created payment method using GET
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode} to capture its
 *    initial state (especially id, created_at, updated_at and other fields).
 * 4. Update the payment method via PUT
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}, modifying multiple
 *    mutable fields such as display_name, description, min_amount, max_amount,
 *    and status.
 * 5. Fetch the payment method again using the same GET endpoint.
 * 6. Assert that:
 *
 *    - Id is unchanged between initial and updated records.
 *    - Code is unchanged and equals the business code used in path.
 *    - Created_at is unchanged.
 *    - Updated_at has changed (i.e., differs from original updated_at).
 *    - Updated fields exactly match the values sent in the update body.
 *    - Fields not touched in the update (e.g., provider_type, allowed_currencies,
 *         allowed_countries when left out) are preserved.
 *
 * This verifies that the detail endpoint always reflects the latest state of
 * shopping_mall_payment_methods and that update operations do not inadvertently
 * reset unrelated fields.
 */
export async function test_api_admin_payment_method_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // keep ip undefined to let backend derive it, but href/referrer must be URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create initial payment method with explicit config
  const paymentMethodCode = RandomGenerator.alphaNumeric(12);
  const createBody = {
    code: paymentMethodCode,
    display_name: "Credit Card - Initial",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "disabled",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Basic invariants right after creation
  TestValidator.equals(
    "created.code matches input",
    created.code,
    paymentMethodCode,
  );
  TestValidator.equals(
    "created.display_name matches input",
    created.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "created.status matches input",
    created.status,
    createBody.status,
  );

  // 3. Fetch initial state via detail GET
  const initial: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.at(connection, {
      paymentMethodCode,
    });
  typia.assert(initial);

  // Sanity: detail record should equal created (at least for key fields)
  TestValidator.equals("detail.id equals created.id", initial.id, created.id);
  TestValidator.equals(
    "detail.code equals created.code",
    initial.code,
    created.code,
  );
  TestValidator.equals(
    "detail.display_name equals created.display_name",
    initial.display_name,
    created.display_name,
  );
  TestValidator.equals(
    "detail.provider_type equals created.provider_type",
    initial.provider_type,
    created.provider_type,
  );

  // 4. Update multiple mutable fields; omit some to ensure preservation
  const updateBody = {
    display_name: "Credit Card - Updated",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    min_amount: 5000,
    max_amount: 2000000,
    status: "active",
    // intentionally omit provider_type, allowed_currencies, allowed_countries
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updated: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.update(connection, {
      paymentMethodCode,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Fetch again via detail GET
  const detailed: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.at(connection, {
      paymentMethodCode,
    });
  typia.assert(detailed);

  // 6. Assertions on identity and timestamps
  TestValidator.equals(
    "id is stable across create and update",
    detailed.id,
    initial.id,
  );
  TestValidator.equals(
    "created_at is unchanged after update",
    detailed.created_at,
    initial.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    detailed.updated_at,
    initial.updated_at,
  );

  // Updated fields reflect update body
  TestValidator.equals(
    "display_name updated",
    detailed.display_name,
    updateBody.display_name,
  );
  TestValidator.equals(
    "description updated",
    detailed.description,
    updateBody.description,
  );
  TestValidator.equals(
    "min_amount updated",
    detailed.min_amount,
    updateBody.min_amount,
  );
  TestValidator.equals(
    "max_amount updated",
    detailed.max_amount,
    updateBody.max_amount,
  );
  TestValidator.equals("status updated", detailed.status, updateBody.status);

  // Unchanged fields preserved when not specified in update body
  TestValidator.equals(
    "provider_type preserved",
    detailed.provider_type,
    initial.provider_type,
  );
  TestValidator.equals(
    "allowed_currencies preserved",
    detailed.allowed_currencies,
    initial.allowed_currencies,
  );
  TestValidator.equals(
    "allowed_countries preserved",
    detailed.allowed_countries,
    initial.allowed_countries,
  );
}
