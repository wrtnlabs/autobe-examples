import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Test retrieving a cart item when the requested quantity exceeds available stock.
 *
 * This test validates that:
 * 1. Customer can be authenticated via join
 * 2. Cart item can be created with quantity exceeding available stock
 * 3. When retrieving the cart item, the response includes an availability_warning
 *    property indicating stock insufficiency
 * 4. The cart item details are still returned with correct product info and variant options
 * 5. The availability_warning field contains a descriptive message about stock limitation
 */
export async function test_api_cart_item_retrieval_with_stock_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Update connection with authorization token
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create cart item with quantity exceeding available stock
  // Note: The prepare_random_ecommerce_mall_cart_item utility creates a cart item
  // with a variant that has limited stock. We need to request more than available.
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 999, // Requesting a large quantity to exceed any stock
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 3. Retrieve the cart item to check for availability warning
  const retrievedItem =
    await api.functional.ecommerceMall.customer.cart.items.at(
      customerConnection,
      {
        itemId: cartItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 4. Validate the cart item details are correct
  TestValidator.equals("cart item ID matches", retrievedItem.id, cartItem.id);
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "subtotal matches",
    retrievedItem.subtotal,
    cartItem.subtotal,
  );
  // 5. Validate product variant info is present
  TestValidator.predicate(
    "has product variant",
    retrievedItem.product_variant !== undefined,
  );
  TestValidator.predicate(
    "has SKU code",
    retrievedItem.product_variant.sku_code.length > 0,
  );
  // 6. Validate availability warning is present (quantity exceeds stock)
  TestValidator.predicate(
    "has availability_warning for insufficient stock",
    retrievedItem.availability_warning !== null &&
      retrievedItem.availability_warning !== undefined,
  );
  TestValidator.predicate(
    "availability_warning is non-empty string",
    typeof retrievedItem.availability_warning === "string" &&
      retrievedItem.availability_warning.length > 0,
  );
}
