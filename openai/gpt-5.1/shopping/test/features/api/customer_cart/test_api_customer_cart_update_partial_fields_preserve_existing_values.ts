import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

export async function test_api_customer_cart_update_partial_fields_preserve_existing_values(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer so that subsequent calls run as this customer
  const joinBody = {
    email: `customer+partial-${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password-PartialUpdate-1",
    name: RandomGenerator.name(),
    // ip is optional and can be omitted; href and referrer are required
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 2. Create an initial cart with explicit region_code, currency_code, and is_active
  const initialCreateBody = {
    currency_code: "USD",
    region_code: "US-East",
    channel: "web",
    is_active: true,
    metadata: {
      testScenario: "partial-update-preserve-fields",
    },
    // source_guest_token is optional; omit to keep the scenario simple
  } satisfies IShoppingMallCustomerCart.ICreate;

  const createdCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: initialCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(createdCart);

  // Sanity checks on the created cart
  TestValidator.equals(
    "created cart is_active should match requested is_active",
    createdCart.is_active,
    initialCreateBody.is_active,
  );
  TestValidator.equals(
    "created cart currency_code should match requested currency_code",
    createdCart.currency_code,
    initialCreateBody.currency_code,
  );
  TestValidator.equals(
    "created cart region_code should match requested region_code",
    createdCart.region_code,
    initialCreateBody.region_code,
  );
  TestValidator.equals(
    "created cart customer id must match authorized customer id",
    createdCart.customer.id,
    authorized.id,
  );

  // Snapshot baseline values to compare after partial updates
  const baselineCart: IShoppingMallCustomerCart = createdCart;

  // 3. First partial update: only set display_name in IUpdate
  const firstUpdateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    // All other IUpdate fields omitted on purpose to simulate partial update
  } satisfies IShoppingMallCustomerCart.IUpdate;

  const firstUpdatedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.update(
      connection,
      {
        customerCartId: baselineCart.id,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(firstUpdatedCart);

  // 4. Verify that immutable and unspecified fields are preserved after first update
  TestValidator.equals(
    "cart id should remain unchanged after display_name-only update",
    firstUpdatedCart.id,
    baselineCart.id,
  );
  TestValidator.equals(
    "cart customer id should remain unchanged after display_name-only update",
    firstUpdatedCart.customer.id,
    baselineCart.customer.id,
  );
  TestValidator.equals(
    "cart status should remain unchanged after display_name-only update",
    firstUpdatedCart.status,
    baselineCart.status,
  );
  TestValidator.equals(
    "cart is_active should remain unchanged when not updated",
    firstUpdatedCart.is_active,
    baselineCart.is_active,
  );
  TestValidator.equals(
    "cart currency_code should remain unchanged when not updated",
    firstUpdatedCart.currency_code,
    baselineCart.currency_code,
  );
  TestValidator.equals(
    "cart region_code should remain unchanged when not updated",
    firstUpdatedCart.region_code,
    baselineCart.region_code,
  );
  TestValidator.equals(
    "cart source_guest_token should remain unchanged when not updated",
    firstUpdatedCart.source_guest_token,
    baselineCart.source_guest_token,
  );
  TestValidator.equals(
    "cart subtotal_amount should remain unchanged after cosmetic update",
    firstUpdatedCart.subtotal_amount,
    baselineCart.subtotal_amount,
  );
  TestValidator.equals(
    "cart discount_amount should remain unchanged after cosmetic update",
    firstUpdatedCart.discount_amount,
    baselineCart.discount_amount,
  );
  TestValidator.equals(
    "cart tax_amount should remain unchanged after cosmetic update",
    firstUpdatedCart.tax_amount,
    baselineCart.tax_amount,
  );
  TestValidator.equals(
    "cart shipping_amount should remain unchanged after cosmetic update",
    firstUpdatedCart.shipping_amount,
    baselineCart.shipping_amount,
  );
  TestValidator.equals(
    "cart total_amount should remain unchanged after cosmetic update",
    firstUpdatedCart.total_amount,
    baselineCart.total_amount,
  );

  // 5. Second partial update: only set notes in IUpdate to test repeated partial updates
  const secondUpdateBody = {
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    // Again omit all other fields to ensure they are preserved
  } satisfies IShoppingMallCustomerCart.IUpdate;

  const secondUpdatedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.update(
      connection,
      {
        customerCartId: baselineCart.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(secondUpdatedCart);

  // 6. Verify that fields not mentioned in the second update still match the previous state
  TestValidator.equals(
    "cart id should remain unchanged after notes-only update",
    secondUpdatedCart.id,
    firstUpdatedCart.id,
  );
  TestValidator.equals(
    "cart customer id should remain unchanged after notes-only update",
    secondUpdatedCart.customer.id,
    firstUpdatedCart.customer.id,
  );
  TestValidator.equals(
    "cart status should remain unchanged after notes-only update",
    secondUpdatedCart.status,
    firstUpdatedCart.status,
  );
  TestValidator.equals(
    "cart is_active should remain unchanged when not updated in second call",
    secondUpdatedCart.is_active,
    firstUpdatedCart.is_active,
  );
  TestValidator.equals(
    "cart currency_code should remain unchanged when not updated in second call",
    secondUpdatedCart.currency_code,
    firstUpdatedCart.currency_code,
  );
  TestValidator.equals(
    "cart region_code should remain unchanged when not updated in second call",
    secondUpdatedCart.region_code,
    firstUpdatedCart.region_code,
  );
  TestValidator.equals(
    "cart source_guest_token should remain unchanged after notes-only update",
    secondUpdatedCart.source_guest_token,
    firstUpdatedCart.source_guest_token,
  );
  TestValidator.equals(
    "cart subtotal_amount should remain unchanged after notes-only update",
    secondUpdatedCart.subtotal_amount,
    firstUpdatedCart.subtotal_amount,
  );
  TestValidator.equals(
    "cart discount_amount should remain unchanged after notes-only update",
    secondUpdatedCart.discount_amount,
    firstUpdatedCart.discount_amount,
  );
  TestValidator.equals(
    "cart tax_amount should remain unchanged after notes-only update",
    secondUpdatedCart.tax_amount,
    firstUpdatedCart.tax_amount,
  );
  TestValidator.equals(
    "cart shipping_amount should remain unchanged after notes-only update",
    secondUpdatedCart.shipping_amount,
    firstUpdatedCart.shipping_amount,
  );
  TestValidator.equals(
    "cart total_amount should remain unchanged after notes-only update",
    secondUpdatedCart.total_amount,
    firstUpdatedCart.total_amount,
  );
}
