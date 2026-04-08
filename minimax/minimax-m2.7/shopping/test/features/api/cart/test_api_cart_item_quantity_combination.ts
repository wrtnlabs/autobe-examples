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
import { generate_random_ecommerce_mall_customer_me_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_me_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Test cart item quantity combination when adding the same variant twice.
 *
 * Validates that when a customer adds the same product variant to their cart
 * multiple times, the quantities are combined into a single cart item rather
 * than creating duplicate entries. This is a core shopping cart behavior where
 * adding an existing item increments its quantity.
 *
 * The test verifies:
 * - First add creates a cart item with the specified quantity
 * - Second add with same variant combines quantities (2 + 3 = 5)
 * - Subtotal is correctly calculated based on combined quantity
 * - Only one cart item exists for the variant (no duplicates)
 *
 * 1. Register a new customer with email and password.
 * 2. First add: Add product variant to cart with quantity 2.
 * 3. Second add: Add same variant with quantity 3.
 * 4. Validate combined quantity and subtotal calculation.
 * 5. Validate cart contains only one item for this variant.
 */
export async function test_api_cart_item_quantity_combination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and create authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  // 2. Generate a random product variant ID for testing
  // In production, this would be a real variant ID from existing product
  const productVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First add: Add variant to cart with quantity 2
  const firstAdd: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.me.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: productVariantId,
          quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(firstAdd);
  // Validate first add result
  TestValidator.equals("first add quantity", firstAdd.quantity, 2);
  TestValidator.equals(
    "first add variant matches",
    firstAdd.variant.id,
    productVariantId,
  );
  // Store the cart item ID and unit price for later validation
  const firstCartItemId: string = firstAdd.id;
  const unitPrice: number =
    firstAdd.variant.price ?? firstAdd.product.basePrice;
  // 4. Second add: Add same variant with quantity 3
  const secondAdd: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.me.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: productVariantId,
          quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(secondAdd);
  // Validate second add result - quantities should be combined
  TestValidator.equals("combined quantity", secondAdd.quantity, 5);
  TestValidator.equals(
    "second add variant matches",
    secondAdd.variant.id,
    productVariantId,
  );
  // Validate subtotal calculation
  const expectedSubtotal: number = 5 * unitPrice;
  TestValidator.equals(
    "subtotal calculated correctly",
    secondAdd.subtotal,
    expectedSubtotal,
  );
  // The cart item ID should remain the same (same item, updated quantity)
  TestValidator.equals(
    "cart item ID unchanged (same entry)",
    secondAdd.id,
    firstCartItemId,
  );
}
