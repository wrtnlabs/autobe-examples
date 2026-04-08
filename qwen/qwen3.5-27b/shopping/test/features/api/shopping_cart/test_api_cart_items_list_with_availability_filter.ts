import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test cart item availability filtering and unavailable item marking.
 *
 * Validates the complete cart item availability filtering flow including seller product creation, customer cart item addition, product deletion by seller, and cart item listing with availability filters. Ensures that when a product is deleted, its cart items are marked as unavailable but still accessible for removal, and that the availableOnly filter correctly excludes unavailable items from the response.
 *
 * Special attention is given to verifying that unavailable cart items retain complete product and variant information for display purposes, that subtotals are calculated even for unavailable items, and that pagination correctly counts both available and unavailable items when the filter is not applied.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Customer registers and authenticates to the platform.
 * 3. Seller creates first product with a variant and stock.
 * 4. Seller creates second product with a variant and stock.
 * 5. Customer adds first product variant to their cart.
 * 6. Customer adds second product variant to their cart.
 * 7. Seller deletes the first product, making its cart item unavailable.
 * 8. Customer retrieves cart items with availableOnly=true filter - should return only the available item.
 * 9. Customer retrieves cart items with availableOnly=false filter - should return both items with availability flags.
 * 10. Customer retrieves cart items without filter (default) - should return both items.
 * 11. Validates that unavailable item has available=false flag and complete product/variant information.
 * 12. Validates that subtotals are calculated for both available and unavailable items.
 * 13. Validates that pagination records count includes both available and unavailable items.
 */
export async function test_api_cart_items_list_with_availability_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Seller creates first product
  const product1 = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // 4. Seller creates second product
  const product2 = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 5. Customer adds first product variant to cart
  const cartItem1 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: product1.variants[0].id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // 6. Customer adds second product variant to cart
  const cartItem2 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: product2.variants[0].id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 7. Seller deletes first product (making its cart item unavailable)
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product1.id,
  });
  // 8. Test with availableOnly=true - should return only the available item
  const availableOnlyResult =
    await api.functional.shoppingMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          availableOnly: true,
        } satisfies IShoppingMallCustomerCartItem.IRequest,
      },
    );
  typia.assert(availableOnlyResult);
  TestValidator.equals(
    "availableOnly=true returns only available items",
    availableOnlyResult.data.length,
    1,
  );
  TestValidator.equals(
    "available item is product2 variant",
    availableOnlyResult.data[0].productVariant.id,
    product2.variants[0].id,
  );
  TestValidator.equals(
    "pagination records with availableOnly=true",
    availableOnlyResult.pagination.records,
    1,
  );
  // 9. Test with availableOnly=false - should return both items
  const unavailableResult =
    await api.functional.shoppingMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          availableOnly: false,
        } satisfies IShoppingMallCustomerCartItem.IRequest,
      },
    );
  typia.assert(unavailableResult);
  TestValidator.equals(
    "availableOnly=false returns all items",
    unavailableResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records with availableOnly=false",
    unavailableResult.pagination.records,
    2,
  );
  // 10. Test without filter (default) - should return both items
  const defaultResult =
    await api.functional.shoppingMall.customer.cart.items.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCustomerCartItem.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default filter returns all items",
    defaultResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records without filter",
    defaultResult.pagination.records,
    2,
  );
  // 11. Find unavailable item and verify its properties
  const unavailableItem = unavailableResult.data.find(
    (item) => item.productVariant.id === product1.variants[0].id,
  );
  if (unavailableItem === undefined)
    throw new Error("Unavailable item not found in response");
  TestValidator.predicate(
    "unavailable item has available=false flag",
    unavailableItem.available === false,
  );
  TestValidator.predicate(
    "unavailable item has complete product information",
    unavailableItem.product.name !== undefined &&
      unavailableItem.product.base_price !== undefined,
  );
  TestValidator.predicate(
    "unavailable item has complete variant information",
    unavailableItem.productVariant.sku_code !== undefined,
  );
  TestValidator.predicate(
    "unavailable item has calculated subtotal",
    unavailableItem.subtotal > 0,
  );
  // 12. Find available item and verify its properties
  const availableItem = unavailableResult.data.find(
    (item) => item.productVariant.id === product2.variants[0].id,
  );
  if (availableItem === undefined)
    throw new Error("Available item not found in response");
  TestValidator.predicate(
    "available item has available=true flag",
    availableItem.available === true,
  );
  TestValidator.predicate(
    "available item has calculated subtotal",
    availableItem.subtotal > 0,
  );
}
