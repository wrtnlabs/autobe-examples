import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_cart_item_quantity_update_stock_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerEmail = sellerAuth.email;
  const sellerPassword = "TestPassword123!";
  // Re-login with password for approved seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Create product with a variant that has limited stock
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  // 3. Create variant with limited stock (e.g., 2 units)
  const limitedStock = 2;
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerLoginConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          quantity: limitedStock,
          option_values: [
            {
              key: "size",
              value: "Large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
        params: { productId: product.id },
      },
    );
  // 4. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Add variant to cart with quantity within stock limit
  const initialQuantity = 1;
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: initialQuantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Update cart item quantity to exceed available stock
  const excessiveQuantity = limitedStock + 3; // 5 when stock is only 2
  const updatedCartItem =
    await api.functional.ecommerceMall.customer.customers.cart.items.update(
      customerConnection,
      {
        itemId: cartItem.id,
        body: {
          quantity: excessiveQuantity,
        } satisfies IEcommerceMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // 7. Verify the update succeeded (no error thrown) and cart item still exists
  TestValidator.equals(
    "cart item still exists",
    updatedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "quantity updated to requested value",
    updatedCartItem.quantity,
    excessiveQuantity,
  );
  // 8. Verify availability_warning is present indicating stock insufficiency
  TestValidator.predicate(
    "availability_warning is present when quantity exceeds stock",
    updatedCartItem.availability_warning !== null &&
      updatedCartItem.availability_warning !== undefined,
  );
  TestValidator.predicate(
    "availability_warning contains relevant message",
    updatedCartItem.availability_warning!.includes("Stock") ||
      updatedCartItem.availability_warning!.includes("insufficient"),
  );
}
