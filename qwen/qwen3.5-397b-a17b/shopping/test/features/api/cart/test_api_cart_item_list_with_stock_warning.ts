import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_cart_item_list_with_stock_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create first variant with sufficient stock (100 units)
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: 100,
          options: [
            {
              key: "color",
              value: "Red",
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 4. Create second variant with limited stock (5 units)
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(9)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: 5,
          options: [
            {
              key: "color",
              value: "Blue",
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 5. Create inventory record for first variant (sufficient stock)
  const inventory1 =
    await api.functional.shoppingMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          quantity_change: 100,
          reason: "RESTOCK",
          reference_id: null,
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory1);
  // 6. Create inventory record for second variant (limited stock)
  const inventory2 =
    await api.functional.shoppingMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant2.id,
        body: {
          quantity_change: 5,
          reason: "RESTOCK",
          reference_id: null,
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory2);
  // 7. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 8. Add first variant to cart with quantity within stock limit (10 units)
  const cartItem1 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: 10,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // 9. Add second variant to cart with quantity exceeding stock (10 units when only 5 available)
  const cartItem2 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: 10,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 10. Retrieve cart items list
  const cartItems = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at,asc",
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(cartItems);
  // 11. Validate pagination metadata
  TestValidator.predicate("has pagination", cartItems.pagination !== undefined);
  TestValidator.equals("current page", cartItems.pagination.current, 1);
  TestValidator.predicate("limit is positive", cartItems.pagination.limit > 0);
  TestValidator.equals("records count", cartItems.pagination.records, 2);
  TestValidator.equals("pages count", cartItems.pagination.pages, 1);
  // 12. Validate cart items
  TestValidator.predicate("has 2 items", cartItems.data.length === 2);
  // 13. Validate first item (no stock warning)
  const item1 = cartItems.data[0];
  TestValidator.equals("variant1 id matches", item1.variant.id, variant1.id);
  TestValidator.equals("variant1 quantity", item1.quantity, 10);
  TestValidator.predicate("variant1 available", item1.available === true);
  TestValidator.predicate(
    "variant1 no stock warning",
    item1.stockWarning === false,
  );
  TestValidator.predicate("variant1 unitPrice positive", item1.unitPrice > 0);
  TestValidator.equals(
    "variant1 subtotal",
    item1.subtotal,
    item1.unitPrice * item1.quantity,
  );
  TestValidator.predicate(
    "variant1 has options",
    item1.variant.optionValues.length > 0,
  );
  // 14. Validate second item (stock warning triggered)
  const item2 = cartItems.data[1];
  TestValidator.equals("variant2 id matches", item2.variant.id, variant2.id);
  TestValidator.equals("variant2 quantity", item2.quantity, 10);
  TestValidator.predicate("variant2 available", item2.available === true);
  TestValidator.predicate(
    "variant2 has stock warning",
    item2.stockWarning === true,
  );
  TestValidator.predicate("variant2 unitPrice positive", item2.unitPrice > 0);
  TestValidator.equals(
    "variant2 subtotal",
    item2.subtotal,
    item2.unitPrice * item2.quantity,
  );
  TestValidator.predicate(
    "variant2 has options",
    item2.variant.optionValues.length > 0,
  );
  // 15. Validate sorting (created_at ascending)
  TestValidator.predicate(
    "items sorted by created_at asc",
    new Date(item1.createdAt).getTime() <= new Date(item2.createdAt).getTime(),
  );
}