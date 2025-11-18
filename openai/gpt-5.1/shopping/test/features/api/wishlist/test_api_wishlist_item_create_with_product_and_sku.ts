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
 * Validate that an authenticated customer can create a wishlist item
 * referencing a concrete product and SKU in their own wishlist.
 *
 * Business flow covered by this test:
 *
 * 1. Register a customer via /auth/customer/join (establishes customer auth).
 * 2. Register a seller via /auth/seller/join (establishes seller auth).
 * 3. Register an admin via /auth/admin/join (establishes admin auth).
 * 4. As admin, create a category and a purchasable SKU inventory state.
 * 5. As seller, create a base product.
 * 6. As admin, link the product to the category.
 * 7. As seller, create a SKU under the product using the inventory state.
 * 8. As customer, create a wishlist.
 * 9. As the same customer, create a wishlist item under that wishlist, referencing
 *    the created product and SKU with an explicit position.
 * 10. Assert that the returned IShoppingMallWishlistItem is consistent:
 *
 *     - Wishlist id, product id, sku id and position are as expected
 *     - Product and sku summary relations are populated and aligned.
 */
export async function test_api_wishlist_item_create_with_product_and_sku(
  connection: api.IConnection,
) {
  // 1. Customer join (establish authenticated customer session)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  const customerEmail = customerAuth.email;
  const customerPassword = customerJoinBody.password;

  // 2. Seller join (establish authenticated seller session)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  const sellerEmail = sellerAuth.email;
  const sellerPassword = sellerJoinBody.password;

  // 3. Admin join (establish authenticated admin session)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  const adminEmail = adminAuth.email;
  const adminPassword = adminJoinBody.password;

  // 4. Admin: create category and SKU inventory state
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const skuInventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Standard purchasable inventory state for SKUs",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 5. Switch to seller and create product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(12) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 6. Switch to admin and link product to category
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/catalog",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 7. Switch back to seller and create SKU under the product
  const sellerLoginAgainBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login2",
    referrer: "https://seller.example.com/catalog",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginAgainBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as number & tags.Minimum<0>,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 8. Switch back to customer and create wishlist
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/wishlists",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoginAgain);

  const wishlistBody = {
    name: "My Wishlist",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 9. Create wishlist item referencing product and SKU
  const requestedPosition = 1 as number & tags.Type<"int32">;

  const wishlistItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: requestedPosition,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody,
      },
    );
  typia.assert<IShoppingMallWishlistItem>(wishlistItem);

  // 10. Assertions: ownership, references, and relations
  TestValidator.equals(
    "wishlist item belongs to the correct wishlist",
    wishlistItem.shopping_mall_wishlist_id,
    wishlist.id,
  );

  TestValidator.equals(
    "wishlist item references the correct product",
    wishlistItem.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "wishlist item references the correct sku",
    wishlistItem.shopping_mall_sku_id,
    sku.id,
  );

  TestValidator.equals(
    "wishlist item position matches the requested position",
    wishlistItem.position,
    requestedPosition,
  );

  TestValidator.predicate(
    "wishlist item product summary is populated and aligned",
    () =>
      wishlistItem.product !== undefined &&
      wishlistItem.product.id === wishlistItem.shopping_mall_product_id &&
      wishlistItem.product.name.length > 0,
  );

  TestValidator.predicate(
    "wishlist item sku summary is populated and aligned",
    () =>
      wishlistItem.sku !== undefined &&
      wishlistItem.sku !== null &&
      wishlistItem.sku.id === wishlistItem.shopping_mall_sku_id &&
      wishlistItem.sku.code.length > 0,
  );
}
