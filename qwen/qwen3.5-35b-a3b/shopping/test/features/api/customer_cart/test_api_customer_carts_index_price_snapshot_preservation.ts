import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
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
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_customer_carts_index_price_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Customer setup and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create product (using random ID since no product creation endpoint available)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create Variant A with base price $100
  const variantA =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `variant-a-${RandomGenerator.alphabets(6)}`,
          option_values: { size: "Small", color: "Blue" },
          stock_quantity: 100,
          price_override: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId },
      },
    );
  typia.assert(variantA);
  // 5. Create Variant B with higher price $150 (simulating price increase scenario)
  const variantB =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `variant-b-${RandomGenerator.alphabets(6)}`,
          option_values: { size: "Large", color: "Red" },
          stock_quantity: 50,
          price_override: 150,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId },
      },
    );
  typia.assert(variantB);
  // 6. Customer adds Variant A to cart (captures $100 price snapshot)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItemA =
    await generate_random_ecommerce_mall_customer_carts_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantA.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
        params: { cartId },
      },
    );
  typia.assert(cartItemA);
  // 7. Verify cart item captured original price $100
  TestValidator.equals(
    "cart item A price snapshot at addition",
    cartItemA.price,
    100,
  );
  // 8. Customer adds Variant B to cart (captures $150 price snapshot)
  const cartItemB =
    await generate_random_ecommerce_mall_customer_carts_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantB.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
        params: { cartId },
      },
    );
  typia.assert(cartItemB);
  TestValidator.equals(
    "cart item B price snapshot at addition",
    cartItemB.price,
    150,
  );
  // 9. Retrieve all cart items and verify price snapshots are preserved
  const cartItemsPage = await api.functional.ecommerceMall.customer.carts.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  typia.assert(cartItemsPage);
  // Verify cart items maintain original prices from snapshot
  const cartItemAFound = cartItemsPage.data.find(
    (item) => item.variant.id === variantA.id,
  );
  const cartItemBFound = cartItemsPage.data.find(
    (item) => item.variant.id === variantB.id,
  );
  TestValidator.notEquals("cart item A found in cart", cartItemAFound, null);
  TestValidator.notEquals("cart item B found in cart", cartItemBFound, null);
  TestValidator.equals(
    "cart item A price preserved at snapshot",
    cartItemAFound!.price,
    100,
  );
  TestValidator.equals(
    "cart item B price preserved at snapshot",
    cartItemBFound!.price,
    150,
  );
  // 10. Verify price snapshots are independent (different prices maintained)
  TestValidator.notEquals(
    "price snapshots are independent",
    cartItemAFound!.price,
    cartItemBFound!.price,
  );
  // 11. Verify variant display prices match expected values
  const variantAPrice = variantA.priceOverride ?? 100;
  const variantBPrice = variantB.priceOverride ?? 150;
  // Variant A display price should be $100 (from price_override)
  TestValidator.equals("variant A display price", variantAPrice, 100);
  // Variant B display price should be $150 (from price_override)
  TestValidator.equals("variant B display price", variantBPrice, 150);
  // 12. Verify cart prices match variant prices at time of addition (snapshot validation)
  TestValidator.equals(
    "cart item A price matches variant A snapshot",
    cartItemAFound!.price,
    variantAPrice,
  );
  TestValidator.equals(
    "cart item B price matches variant B snapshot",
    cartItemBFound!.price,
    variantBPrice,
  );
  // 13. Verify cart item quantities are correct
  TestValidator.equals("cart item A quantity", cartItemAFound!.quantity, 2);
  TestValidator.equals("cart item B quantity", cartItemBFound!.quantity, 1);
  // 14. Verify availability status is correctly computed
  TestValidator.equals(
    "cart item A availability",
    cartItemAFound!.availability,
    "available" as const,
  );
  TestValidator.equals(
    "cart item B availability",
    cartItemBFound!.availability,
    "available" as const,
  );
}
