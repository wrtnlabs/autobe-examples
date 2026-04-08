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
 * Test bulk cart replacement with valid items.
 *
 * Validates that a customer can atomically replace their entire shopping cart contents using the bulk update endpoint. This test verifies the complete cart replacement workflow including:
 *
 * - Initial cart population with one variant
 * - Bulk replacement with multiple new variants
 * - Verification that old items are completely removed
 * - Cart total calculation accuracy
 * - Timestamp refresh on cart modification
 *
 * **Test Flow:**
 * 1. Authenticate as customer
 * 2. Replace empty cart with variant1 (qty: 2)
 * 3. Bulk replace with variant2 (qty: 3) and variant3 (qty: 1)
 * 4. Validate only new variants exist in cart
 * 5. Validate cart total = (3 * price_v2) + (1 * price_v3)
 * 6. Validate variant1 is removed
 * 7. Validate updatedAt timestamp is recent
 *
 * Note: This test requires pre-existing product variants (variant1, variant2, variant3) in the database.
 */
export async function test_api_cart_bulk_replace_with_valid_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. First cart replacement with variant1 (quantity 2)
  const variant1Id = typia.random<string & tags.Format<"uuid">>();
  const cart1 = await api.functional.ecommerceMall.customer.me.cart.put(
    customerConnection,
    {
      body: {
        items: [
          {
            productVariantId: variant1Id,
            quantity: 2,
          } satisfies IEcommerceMallCartItem.ICreate,
        ],
      } satisfies IEcommerceMallCart.IUpdate,
    },
  );
  typia.assert(cart1);
  // Record timestamp after first replacement
  const timestampAfterFirst = new Date(cart1.updatedAt).getTime();
  // 3. Bulk replace with variant2 (quantity 3) and variant3 (quantity 1)
  const variant2Id = typia.random<string & tags.Format<"uuid">>();
  const variant3Id = typia.random<string & tags.Format<"uuid">>();
  const quantity2 = 3;
  const quantity3 = 1;
  const cart2 = await api.functional.ecommerceMall.customer.me.cart.put(
    customerConnection,
    {
      body: {
        items: [
          {
            productVariantId: variant2Id,
            quantity: quantity2,
          } satisfies IEcommerceMallCartItem.ICreate,
          {
            productVariantId: variant3Id,
            quantity: quantity3,
          } satisfies IEcommerceMallCartItem.ICreate,
        ],
      } satisfies IEcommerceMallCart.IUpdate,
    },
  );
  typia.assert(cart2);
  // 4. Validate only new variants exist in cart
  TestValidator.equals("cart has 2 items", cart2.items.length, 2);
  const variant2Item = cart2.items.find(
    (item) => item.variant.id === variant2Id,
  );
  const variant3Item = cart2.items.find(
    (item) => item.variant.id === variant3Id,
  );
  const variant1StillExists = cart2.items.some(
    (item) => item.variant.id === variant1Id,
  );
  TestValidator.predicate("variant2 in cart", variant2Item !== undefined);
  TestValidator.predicate("variant3 in cart", variant3Item !== undefined);
  TestValidator.predicate("variant1 removed from cart", !variant1StillExists);
  // 5. Validate quantities
  if (variant2Item) {
    TestValidator.equals(
      "variant2 quantity is 3",
      variant2Item.quantity,
      quantity2,
    );
  }
  if (variant3Item) {
    TestValidator.equals(
      "variant3 quantity is 1",
      variant3Item.quantity,
      quantity3,
    );
  }
  // 6. Validate cart total calculation
  // total = sum of (quantity * price) for each item
  const price2 = variant2Item?.variant.price ?? 0;
  const price3 = variant3Item?.variant.price ?? 0;
  const expectedTotal = quantity2 * price2 + quantity3 * price3;
  TestValidator.equals(
    "cart total calculated correctly",
    cart2.total,
    expectedTotal,
  );
  // 7. Validate updatedAt timestamp is refreshed
  const timestampAfterSecond = new Date(cart2.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt timestamp refreshed after replacement",
    timestampAfterSecond >= timestampAfterFirst,
  );
}
