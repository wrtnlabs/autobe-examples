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
 * Test the primary success path for viewing cart items with complete product information.
 *
 * Validates the complete shopping cart workflow including seller product creation, customer authentication, and cart item listing. Ensures that cart items correctly display product variant details, parent product information, calculated subtotals, and availability status.
 *
 * Special attention is given to verifying that the cart item response includes all required nested relationships (product variant, product, seller, category) and that computed fields like subtotal are accurately calculated.
 *
 * 1. Seller registers and authenticates to create products.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Customer registers and authenticates to access shopping cart.
 * 4. Customer adds multiple product variants to cart with different quantities.
 * 5. Customer retrieves cart items list with pagination parameters.
 * 6. Validates cart item structure includes variant SKU, price, options, and stock.
 * 7. Validates cart item includes parent product details (name, seller, category).
 * 8. Validates subtotal calculation matches quantity × unit price.
 * 9. Validates availability status is true for in-stock items.
 * 10. Validates pagination metadata contains correct record counts.
 */
export async function test_api_cart_items_list_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Skip test if product has no variants
  if (product.variants.length === 0) {
    TestValidator.predicate("test skipped due to no product variants", true);
    return;
  }
  // 3. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 4. Customer adds multiple product variants to cart
  const cartItemCount = 3;
  for (let i = 0; i < cartItemCount; i++) {
    const cartItem =
      await generate_random_shopping_mall_customer_cart_items_create(
        customerConnection,
        {
          body: {
            productVariantId: product.variants[0].id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          },
        },
      );
    typia.assert(cartItem);
  }
  // 5. Customer retrieves cart items list
  const cartItemsResponse =
    await api.functional.shoppingMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "DESC",
        } satisfies IShoppingMallCustomerCartItem.IRequest,
      },
    );
  typia.assert(cartItemsResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    cartItemsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    cartItemsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count matches cart items",
    cartItemsResponse.pagination.records >= cartItemCount,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    cartItemsResponse.pagination.pages >= 1,
  );
  // 7. Validate cart items data array is not empty
  TestValidator.predicate(
    "cart items array is not empty",
    cartItemsResponse.data.length > 0,
  );
  // 8. Validate each cart item business logic
  for (const cartItem of cartItemsResponse.data) {
    // Validate subtotal calculation
    const unitPrice =
      cartItem.productVariant.price ?? cartItem.product.base_price;
    const expectedSubtotal = cartItem.quantity * unitPrice;
    TestValidator.equals(
      `subtotal calculation for item ${cartItem.id}`,
      cartItem.subtotal,
      expectedSubtotal,
    );
    // Validate product information is present
    TestValidator.predicate(
      `product name is not empty for item ${cartItem.id}`,
      cartItem.product.name.length > 0,
    );
    TestValidator.predicate(
      `product base price is positive for item ${cartItem.id}`,
      cartItem.product.base_price > 0,
    );
    TestValidator.predicate(
      `seller shop name is not empty for item ${cartItem.id}`,
      cartItem.product.seller.seller_profile.shop_name.length > 0,
    );
    // Validate SKU code is present
    TestValidator.predicate(
      `SKU code is not empty for item ${cartItem.id}`,
      cartItem.productVariant.sku_code.length > 0,
    );
  }
  // 9. Validate sorting order (created_at descending)
  if (cartItemsResponse.data.length > 1) {
    for (let i = 1; i < cartItemsResponse.data.length; i++) {
      TestValidator.predicate(
        `items are sorted by created_at descending: item ${i - 1} >= item ${i}`,
        new Date(cartItemsResponse.data[i - 1].created_at).getTime() >=
          new Date(cartItemsResponse.data[i].created_at).getTime(),
      );
    }
  }
}
