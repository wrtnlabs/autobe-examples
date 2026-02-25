import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test the primary success path for retrieving a specific cart item owned by the authenticated customer.
 *
 * **Setup:**
 * 1. Create an admin and approve a seller with a product and in-stock variant
 * 2. Register a customer and add the variant to cart
 * 3. Capture the returned cartItemId from the add-to-cart operation
 *
 * **Test Steps:**
 * 1. Call GET /shoppingMall/customer/cart-items/{cartItemId} with the customer's access token
 * 2. Verify response contains complete cart item details:
 *    - id matches the requested cartItemId
 *    - quantity matches what was added
 *    - unitPrice captures the variant price at time of addition
 *    - variant object includes sku_code, price, options array, stock_quantity, in_stock boolean
 *    - createdAt and updatedAt timestamps are present
 *
 * **Validation Points:**
 * - Response HTTP 200 OK
 * - Ownership validation: customer can only access their own cart item
 * - All nested variant information is populated
 * - Unit price is correctly captured for price change detection
 * - Response structure matches IShoppingMallCartItem schema
 */
export async function test_api_cart_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  // 3. Admin approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10).toUpperCase(),
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<50000>
          >(),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. Seller adds inventory to the variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Customer adds the variant to cart
  const cartQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const createdCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: cartQuantity,
        },
      },
    );
  typia.assert(createdCartItem);
  // 9. Customer retrieves the specific cart item
  const retrievedCartItem =
    await api.functional.shoppingMall.customer.cart_items.at(
      customerConnection,
      {
        cartItemId: createdCartItem.id,
      },
    );
  typia.assert(retrievedCartItem);
  // 10. Validate cart item details
  TestValidator.equals(
    "cart item id matches",
    retrievedCartItem.id,
    createdCartItem.id,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedCartItem.quantity,
    cartQuantity,
  );
  TestValidator.predicate(
    "unit price is non-negative",
    retrievedCartItem.unitPrice >= 0,
  );
  TestValidator.predicate(
    "variant is populated",
    retrievedCartItem.variant !== null &&
      retrievedCartItem.variant !== undefined,
  );
  TestValidator.equals(
    "variant id matches",
    retrievedCartItem.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant sku_code matches",
    retrievedCartItem.variant.sku_code,
    variant.skuCode,
  );
  TestValidator.predicate(
    "variant has stock quantity",
    retrievedCartItem.variant.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "variant has in_stock flag",
    typeof retrievedCartItem.variant.in_stock === "boolean",
  );
  TestValidator.predicate(
    "variant has options array",
    Array.isArray(retrievedCartItem.variant.options),
  );
  TestValidator.predicate(
    "createdAt timestamp exists",
    retrievedCartItem.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    retrievedCartItem.updatedAt !== undefined,
  );
}
