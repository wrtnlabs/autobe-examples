import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_cart_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for retrieving a cart item.
   *
   * Setup:
   * 1. Administrator joins and creates category
   * 2. Seller joins and creates product (with variant)
   * 3. Seller adds inventory for the variant
   * 4. Customer adds variant to cart
   * 5. Customer retrieves cart item and validates all fields
   */
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create category (administrator)
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 4. Create product with variant (seller)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Product should have at least one variant
  const variant = product.variants[0];
  typia.assert(variant);
  // 5. Add inventory for the variant (seller)
  const inventoryQuantity = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
  >();
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: inventoryQuantity,
          reason: "Initial stock for test",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer adds variant to cart
  const quantity = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Customer retrieves cart item
  const retrievedItem =
    await api.functional.shoppingMall.customer.cart.items.at(
      customerConnection,
      { cartItemId: cartItem.id },
    );
  typia.assert(retrievedItem);
  // 9. Validate cart item details
  // ID matches
  TestValidator.equals("cart item id", retrievedItem.id, cartItem.id);
  // Variant details
  TestValidator.equals("variant id", retrievedItem.variant.id, variant.id);
  TestValidator.equals(
    "variant sku_code",
    retrievedItem.variant.sku_code,
    variant.sku_code,
  );
  // Price uses variant override when available, otherwise base price
  const expectedPrice = (variant.price ?? product.base_price) satisfies number;
  TestValidator.equals("price", retrievedItem.price, expectedPrice);
  // Subtotal calculation
  const expectedSubtotal = retrievedItem.price * retrievedItem.quantity;
  TestValidator.equals("subtotal", retrievedItem.subtotal, expectedSubtotal);
  // Quantity matches what was added
  TestValidator.equals("quantity", retrievedItem.quantity, quantity);
  // Availability status
  TestValidator.equals("unavailable", retrievedItem.unavailable, false);
  // Stock warning (should be false since quantity within stock limits)
  const stockWarningExpected = quantity > inventoryQuantity;
  TestValidator.equals(
    "stock_warning",
    retrievedItem.stock_warning,
    stockWarningExpected,
  );
  // Product details
  TestValidator.equals("product id", retrievedItem.product.id, product.id);
  TestValidator.equals(
    "product name",
    retrievedItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base_price",
    retrievedItem.product.base_price,
    product.base_price,
  );
  // Seller details
  TestValidator.equals("seller id", retrievedItem.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller shop_name",
    retrievedItem.seller.shop_name,
    sellerAuth.shopName,
  );
  // Timestamps present
  TestValidator.predicate(
    "created_at present",
    retrievedItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    retrievedItem.updated_at.length > 0,
  );
  // Variant stock_quantity is computed from inventory
  TestValidator.predicate(
    "stock_quantity non-negative",
    retrievedItem.variant.stock_quantity >= 0,
  );
}
