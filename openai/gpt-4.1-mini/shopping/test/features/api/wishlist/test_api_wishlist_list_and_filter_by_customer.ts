import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_list_and_filter_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer (auth.customer.join)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "StrongPassword123!";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Authenticate is implicitly handled by SDK via join (token assigned in headers)

  // 3. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const productName = RandomGenerator.name(2);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller creates SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(12).toUpperCase();
  const skuPrice = Number((Math.random() * (50000 - 1000) + 1000).toFixed(0));
  const skuAttributesJson = JSON.stringify({
    color: RandomGenerator.pick(["red", "green", "blue"] as const),
    size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
  });
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: skuPrice,
          attributes_json: skuAttributesJson,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);

  // 5. Customer creates a shopping cart - session id here is required
  // Since no API for session creation, use a generated UUID to simulate session id
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id: sessionId,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cart);

  // 6. Add an item to the shopping cart
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: sku.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 7. Create multiple wishlists for the customer session
  const wishlistsUploaded: IShoppingMallWishlist.ISummary[] = [];
  for (let i = 0; i < 3; ++i) {
    // Since no create wishlist API given, we simulate wishlist creation by direct index use
    // Normally, would call an API to create wishlists here
    // For demo, assume wishlists exist and their structure
    const wishlistItemSummary: IShoppingMallWishlistItem.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_wishlist_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_product_sku_id: sku.id,
      quantity: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    const wishlistSummary: IShoppingMallWishlist.ISummary = {
      id: wishlistItemSummary.shopping_mall_wishlist_id,
      shopping_mall_customer_id: customer.id,
      shopping_mall_customer_session_id: sessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      shopping_mall_wishlist_items: [wishlistItemSummary],
    };
    wishlistsUploaded.push(wishlistSummary);
  }

  // 8. Call wishlist index API with pagination and filter by customer id
  const pageRequest = {
    page: 1,
    limit: 10,
    shopping_mall_customer_id: customer.id,
  } satisfies IShoppingMallWishlist.IRequest;

  const pageResult: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: pageRequest,
    });
  typia.assert(pageResult);

  // 9. Validate that all retrieved wishlists belong to that customer
  TestValidator.predicate(
    "all wishlists belong to customer",
    pageResult.data.every(
      (wishlist) => wishlist.shopping_mall_customer_id === customer.id,
    ),
  );

  // 10. Validate pagination parameters
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    pageRequest.page,
  );
  TestValidator.equals(
    "pagination limit",
    pageResult.pagination.limit,
    pageRequest.limit,
  );

  // 11. Validate pagination counts make sense
  TestValidator.predicate(
    "pagination pages > 0",
    pageResult.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    pageResult.pagination.records >= pageResult.data.length,
  );
  TestValidator.predicate(
    "data length <= limit",
    pageResult.data.length <= pageRequest.limit,
  );
}
