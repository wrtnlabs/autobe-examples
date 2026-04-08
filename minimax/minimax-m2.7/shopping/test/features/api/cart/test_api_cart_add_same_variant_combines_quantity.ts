import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_cart_add_same_variant_combines_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login with known credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPassword123!";
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Create product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: 1000,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 1500,
          quantity: 100,
          optionValues: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 3. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/cart",
      referrer: "https://example.com",
    },
  });
  // 4. Add variant to cart with quantity 2
  const cartFirst =
    await api.functional.ecommerceMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartFirst);
  // 5. Verify cart has one item line with quantity 2
  TestValidator.equals(
    "cart items count after first add",
    cartFirst.items.length,
    1,
  );
  const firstCartItem = cartFirst.items[0];
  TestValidator.equals("first cart item quantity", firstCartItem.quantity, 2);
  TestValidator.equals(
    "first cart item variant id matches",
    firstCartItem.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "first cart item product name matches",
    firstCartItem.productName,
    product.name,
  );
  TestValidator.equals(
    "first cart item availability status",
    firstCartItem.availabilityStatus,
    "available",
  );
  TestValidator.equals(
    "first cart item stock warning",
    firstCartItem.stockWarning,
    false,
  );
  // 6. Add same variant again with quantity 3
  const cartSecond =
    await api.functional.ecommerceMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 3 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartSecond);
  // 7. Verify cart item quantity is now 5 (combined: 2 + 3)
  TestValidator.equals(
    "cart items count after second add (no duplicate)",
    cartSecond.items.length,
    1,
  );
  const secondCartItem = cartSecond.items[0];
  TestValidator.equals(
    "cart item quantity combined",
    secondCartItem.quantity,
    5,
  );
  // 8. Verify only one line item exists for this variant
  const variantLineItems = cartSecond.items.filter(
    (item) => item.variant.id === variant.id,
  );
  TestValidator.equals(
    "only one line item for variant",
    variantLineItems.length,
    1,
  );
  // 9. Verify line subtotal calculated as (price * 5)
  // Variant price is 1500, quantity is 5, so subtotal should be 7500
  TestValidator.equals(
    "line subtotal calculation",
    secondCartItem.lineSubtotal,
    1500 * 5,
  );
}
