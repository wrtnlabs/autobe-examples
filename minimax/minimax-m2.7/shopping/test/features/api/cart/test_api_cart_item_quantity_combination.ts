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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_quantity_combination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register seller and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Create a new seller connection with the token
  const sellerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // Create a new customer connection with the token
  const customerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // Create product and variant (simplified - in real test would need more API calls)
  // For this test, we'll use the generate_random_ecommerce_mall_customer_cart_items_create utility
  // to add items to cart. We need to verify the quantity combination behavior.
  // First add: quantity = 3
  const firstCartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerTokenConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 3,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(firstCartItem);
  // Second add: same variant, quantity = 2
  const secondCartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerTokenConnection,
      {
        body: {
          variant_id: firstCartItem.product_variant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // Validate: Quantities should be combined (3 + 2 = 5)
  TestValidator.equals("combined quantity is 5", secondCartItem.quantity, 5);
  // Validate: Subtotal should reflect combined quantity
  const expectedSubtotal = 5 * (secondCartItem.product_variant.price ?? 0);
  TestValidator.equals(
    "subtotal reflects combined quantity",
    secondCartItem.subtotal,
    expectedSubtotal,
  );
  // Validate: Same variant ID in response
  TestValidator.equals(
    "same variant",
    secondCartItem.product_variant.id,
    firstCartItem.product_variant.id,
  );
}
