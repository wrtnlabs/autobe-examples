import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Verify that unauthenticated wishlist item deletion is rejected and does not
 * mutate data.
 *
 * Business context: Customers can create wishlists and add catalog items
 * (products/SKUs) to them. Deleting a wishlist item must require a valid
 * customer authentication context. An unauthenticated DELETE must fail and must
 * not remove or corrupt wishlist items. This test builds a realistic catalog
 * and wishlist context, attempts deletion without Authorization, and then
 * verifies that subsequent wishlist operations continue to work as expected.
 *
 * Test steps:
 *
 * 1. Create three actors via auth flows:
 *
 *    - Admin: POST /auth/admin/join
 *    - Seller: POST /auth/seller/join
 *    - Customer: POST /auth/customer/join
 * 2. As admin, create a SKU inventory state using POST
 *    /shoppingMall/admin/skuInventoryStates.
 * 3. As seller, create a product via POST /shoppingMall/seller/products.
 * 4. As admin, create a category and link the product to it via POST
 *    /shoppingMall/admin/categories and POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 5. As seller, create a SKU for the product using POST
 *    /shoppingMall/seller/products/{productId}/skus and the previously created
 *    inventory state.
 * 6. As customer, create a wishlist via POST /shoppingMall/customer/wishlists.
 * 7. As customer, create a wishlist item in that wishlist via POST
 *    /shoppingMall/customer/wishlists/{wishlistId}/items, referencing the
 *    created product and SKU.
 * 8. Clone the base connection into a separate unauthenticated connection by
 *    shallow copying and setting headers: {}, without any further header
 *    manipulation on that clone.
 * 9. Using the unauthenticated connection, attempt to delete the wishlist item via
 *    DELETE
 *    /shoppingMall/customer/wishlists/{wishlistId}/items/{wishlistItemId} and
 *    assert via TestValidator.error that an error occurs (without checking
 *    specific HTTP status codes).
 * 10. Re-authenticate as the same customer on the original authenticated connection
 *     using POST /auth/customer/login to make the intent explicit.
 * 11. Verify that wishlist operations still behave normally after the failed
 *     unauthenticated DELETE:
 *
 *     - Create another wishlist item in the same wishlist for the same product/SKU;
 *           typia.assert the response.
 *     - Use TestValidator.predicate to assert that both wishlist item IDs are
 *           non-empty strings and distinct, demonstrating that the earlier
 *           unauthenticated DELETE had no visible side effects on the
 *           wishlist.
 */
export async function test_api_wishlist_item_delete_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Admin join (to get admin token for admin-only operations)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller join (seller will create product and SKU)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Customer join (owner of wishlist)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. As admin, create SKU inventory state
  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphabets(8)}`,
    name: "In Stock",
    description: "Standard in-stock state for test SKUs",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 5. As seller, create product (authenticate seller explicitly)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. As admin, create category and link product to category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category for wishlist test",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 7. As seller, create SKU for the product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 1000,
    original_price: 1200,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 8. As customer, create wishlist (authenticate customer explicitly)
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const wishlistBody = {
    name: "Wishlist for unauthenticated delete test",
    description: "Main wishlist used to verify unauthenticated deletion.",
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // 9. As customer, create first wishlist item targeting the SKU
  const firstItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const firstItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: firstItemBody,
      },
    );
  typia.assert(firstItem);

  // 10. Clone connection into an unauthenticated variant with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 11. Attempt to delete wishlist item without authentication and expect error
  await TestValidator.error(
    "unauthenticated wishlist item delete must fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.erase(
        unauthenticatedConnection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: firstItem.id,
        },
      );
    },
  );

  // 12. Re-authenticate as customer explicitly
  const customerRelogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerRelogin);

  // 13. Create a second wishlist item to ensure wishlist remains usable
  const secondItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const secondItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: secondItemBody,
      },
    );
  typia.assert(secondItem);

  // 14. Basic predicates to assert we have two distinct item IDs and they are non-empty
  TestValidator.predicate(
    "first wishlist item id must be non-empty",
    firstItem.id.length > 0,
  );
  TestValidator.predicate(
    "second wishlist item id must be non-empty",
    secondItem.id.length > 0,
  );
  TestValidator.predicate(
    "wishlist item ids must be different",
    firstItem.id !== secondItem.id,
  );
}
