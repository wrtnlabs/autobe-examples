import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test viewing order item snapshots with pagination for authenticated customers.
 *
 * Validates the complete order item snapshot listing workflow including seller product setup, customer authentication, order placement, and snapshot retrieval with pagination. Ensures that snapshots preserve the exact product, variant, and seller information at the time of purchase.
 *
 * Special attention is given to verifying pagination metadata accuracy and snapshot data integrity. The test confirms that snapshots are immutable records that maintain historical purchase data regardless of subsequent product or seller profile modifications.
 *
 * 1. Seller registers and authenticates to create products.
 * 2. Customer registers and authenticates to place orders.
 * 3. Seller creates a product with base price and description.
 * 4. Seller creates a product variant with SKU code, options, and initial stock.
 * 5. Customer adds the variant to their shopping cart with quantity.
 * 6. Customer completes checkout to create an order, generating order item snapshots.
 * 7. Customer retrieves order item snapshots with default pagination (page=1, limit=20).
 * 8. Validates pagination metadata: current page is 1, limit is 20, records count matches actual snapshots, pages calculation is correct.
 * 9. Validates snapshot data: each snapshot contains product_name, product_category_name, product_base_price, variant_sku_code, variant_price, seller_shop_name, seller_shop_logo_uri, and created_at.
 * 10. Verifies snapshots are sorted by created_at descending (newest first).
 * 11. Confirms snapshot data matches the product, variant, and seller state at purchase time.
 * 12. Tests pagination by requesting page 2 and verifying empty data array when fewer than 20 records exist.
 */
export async function test_api_order_item_snapshot_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with inventory
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer completes checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 7. Customer retrieves order item snapshots with default pagination
  const snapshotsPage1 =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage1);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    snapshotsPage1.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", snapshotsPage1.pagination.limit, 20);
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsPage1.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    snapshotsPage1.pagination.pages ===
      Math.ceil(
        snapshotsPage1.pagination.records / snapshotsPage1.pagination.limit,
      ),
  );
  // 9. Validate snapshot data structure
  TestValidator.predicate(
    "snapshots array is not empty",
    snapshotsPage1.data.length > 0,
  );
  const firstSnapshot = snapshotsPage1.data[0];
  TestValidator.predicate(
    "snapshot has product_name",
    firstSnapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has variant_sku_code",
    firstSnapshot.variant_sku_code.length > 0,
  );
  TestValidator.predicate(
    "snapshot has product_base_price",
    firstSnapshot.product_base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has variant_price",
    firstSnapshot.variant_price > 0,
  );
  TestValidator.predicate(
    "snapshot has seller_shop_name",
    firstSnapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    firstSnapshot.created_at.length > 0,
  );
  // 10. Verify snapshot data matches purchase time state
  TestValidator.equals(
    "product name matches",
    firstSnapshot.product_name,
    product.name,
  );
  TestValidator.equals(
    "variant SKU code matches",
    firstSnapshot.variant_sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "product base price matches",
    firstSnapshot.product_base_price,
    product.base_price,
  );
  TestValidator.equals(
    "variant price matches",
    firstSnapshot.variant_price,
    variant.price ?? product.base_price,
  );
  TestValidator.equals(
    "seller shop name matches",
    firstSnapshot.seller_shop_name,
    sellerAuth.shop_name,
  );
  TestValidator.predicate(
    "seller logo URI matches",
    firstSnapshot.seller_shop_logo_uri === sellerAuth.logo_uri,
  );
  // 11. Test pagination with page 2 (should be empty if fewer than 20 records)
  const snapshotsPage2 =
    await api.functional.shoppingMall.customer.order_item_snapshots.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage2);
  TestValidator.equals(
    "page 2 current is 2",
    snapshotsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 20",
    snapshotsPage2.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 2 has empty data array",
    snapshotsPage2.data.length === 0,
  );
  TestValidator.equals(
    "page 2 records count matches page 1",
    snapshotsPage2.pagination.records,
    snapshotsPage1.pagination.records,
  );
}
