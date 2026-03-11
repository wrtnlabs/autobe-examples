import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_cart_item_quantity_merging(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerBody,
  });
  typia.assert(seller);
  // 2. Seller login to get authorized connection for creating products
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email satisfies string as string,
      password: sellerBody.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_values: { size: "Large", color: "Red" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer setup - Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerBody = {
    email: typia.random<
      string & tags.Format<"email">
    >() satisfies string as string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerBody,
  });
  typia.assert(customer);
  // 6. Customer creates a shopping cart
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 7. First addition: Add variant with quantity 2
  const firstAddition =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(firstAddition);
  // 8. Capture original values for comparison
  const originalCreatedAt = firstAddition.createdAt;
  const originalPrice = firstAddition.price;
  const originalQuantity = firstAddition.quantity;
  TestValidator.equals("first addition quantity", originalQuantity, 2);
  TestValidator.equals("variant matches", firstAddition.variant.id, variant.id);
  TestValidator.predicate(
    "createdAt is valid date-time",
    originalCreatedAt !== undefined,
  );
  // 9. Second addition: Add same variant with quantity 3
  const secondAddition =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variant.id,
          quantity: 3,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(secondAddition);
  // 10. Verify quantity merging
  TestValidator.equals("merged quantity", secondAddition.quantity, 5);
  TestValidator.equals(
    "variant unchanged",
    secondAddition.variant.id,
    variant.id,
  );
  // 11. Verify createdAt preserved (original addition timestamp)
  TestValidator.equals(
    "createdAt preserved",
    secondAddition.createdAt,
    originalCreatedAt,
  );
  // 12. Verify updatedAt updated (new timestamp for quantity modification)
  TestValidator.notEquals(
    "updatedAt updated",
    originalCreatedAt,
    secondAddition.updatedAt,
  );
  // 13. Verify price snapshot unchanged
  TestValidator.equals(
    "price snapshot preserved",
    secondAddition.price,
    originalPrice,
  );
}
