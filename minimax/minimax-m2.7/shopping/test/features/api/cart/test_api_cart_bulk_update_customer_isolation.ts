import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Test that customers can only access and modify their own cart, enforcing customer isolation.
 *
 * Validates the shopping cart system properly isolates cart data between different customers.
 * Each customer's cart operations must be independent and must not affect other customers' carts.
 *
 * **Test Strategy**:
 * 1. Create two separate customers with unique credentials
 * 2. Each customer updates their cart with different items via bulk update
 * 3. Verify each customer sees only their own cart items
 * 4. One customer updates their cart - other customer's cart must remain unchanged
 * 5. Validates complete isolation of cart operations per customer
 *
 * This test ensures proper data isolation in multi-tenant e-commerce cart system,
 * preventing any cross-customer data leakage or cart contamination.
 */
export async function test_api_cart_bulk_update_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer1 connection
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {});
  // 2. Create customer2 connection
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {});
  // 3. Customer1 updates cart with variant1 (quantity 5)
  const variant1Id = typia.random<string & tags.Format<"uuid">>();
  const variant2Id = typia.random<string & tags.Format<"uuid">>();
  const cart1Update1 = await api.functional.ecommerceMall.customer.me.cart.put(
    customer1Connection,
    {
      body: {
        items: [
          {
            productVariantId: variant1Id,
            quantity: 5,
          } satisfies IEcommerceMallCartItem.ICreate,
        ],
      } satisfies IEcommerceMallCart.IUpdate,
    },
  );
  typia.assert(cart1Update1);
  // 4. Customer2 updates cart with variant2 (quantity 3)
  const cart2Update1 = await api.functional.ecommerceMall.customer.me.cart.put(
    customer2Connection,
    {
      body: {
        items: [
          {
            productVariantId: variant2Id,
            quantity: 3,
          } satisfies IEcommerceMallCartItem.ICreate,
        ],
      } satisfies IEcommerceMallCart.IUpdate,
    },
  );
  typia.assert(cart2Update1);
  // 5. Verify customer1's cart contains variant1 with quantity 5
  TestValidator.equals(
    "customer1 cart has 1 item",
    cart1Update1.items.length,
    1,
  );
  TestValidator.equals(
    "customer1 cart variant1 id matches",
    cart1Update1.items[0]!.variant.id,
    variant1Id,
  );
  TestValidator.equals(
    "customer1 cart variant1 quantity is 5",
    cart1Update1.items[0]!.quantity,
    5,
  );
  // 6. Verify customer2's cart contains variant2 with quantity 3
  TestValidator.equals(
    "customer2 cart has 1 item",
    cart2Update1.items.length,
    1,
  );
  TestValidator.equals(
    "customer2 cart variant2 id matches",
    cart2Update1.items[0]!.variant.id,
    variant2Id,
  );
  TestValidator.equals(
    "customer2 cart variant2 quantity is 3",
    cart2Update1.items[0]!.quantity,
    3,
  );
  // 7. Customer1 replaces their cart with variant2 (quantity 10)
  const cart1Update2 = await api.functional.ecommerceMall.customer.me.cart.put(
    customer1Connection,
    {
      body: {
        items: [
          {
            productVariantId: variant2Id,
            quantity: 10,
          } satisfies IEcommerceMallCartItem.ICreate,
        ],
      } satisfies IEcommerceMallCart.IUpdate,
    },
  );
  typia.assert(cart1Update2);
  // 8. Verify customer1's cart now contains variant2 with quantity 10
  TestValidator.equals(
    "customer1 cart updated to variant2",
    cart1Update2.items.length,
    1,
  );
  TestValidator.equals(
    "customer1 cart variant2 id matches",
    cart1Update2.items[0]!.variant.id,
    variant2Id,
  );
  TestValidator.equals(
    "customer1 cart variant2 quantity is 10",
    cart1Update2.items[0]!.quantity,
    10,
  );
  // 9. Verify customer2's cart still contains variant2 with quantity 3 (unchanged)
  TestValidator.equals(
    "customer2 cart unchanged - still has 1 item",
    cart2Update1.items.length,
    1,
  );
  TestValidator.equals(
    "customer2 cart variant2 id unchanged",
    cart2Update1.items[0]!.variant.id,
    variant2Id,
  );
  TestValidator.equals(
    "customer2 cart variant2 quantity still 3",
    cart2Update1.items[0]!.quantity,
    3,
  );
  // 10. Validate isolation - customer1's cart total changed, customer2's remained same
  TestValidator.notEquals(
    "customer1 cart total changed",
    cart1Update1.total,
    cart1Update2.total,
  );
  TestValidator.equals(
    "customer2 cart total unchanged",
    cart2Update1.total,
    cart2Update1.total,
  );
}
