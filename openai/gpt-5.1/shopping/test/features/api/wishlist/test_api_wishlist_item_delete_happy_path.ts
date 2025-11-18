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

export async function test_api_wishlist_item_delete_happy_path(
  connection: api.IConnection,
) {
  // 1. Prepare unique emails and common href/referrer URIs
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> =
    "https://shoppingmall.local/join" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://shoppingmall.local/landing" as string & tags.Format<"uri">;

  // Generate password values compatible with tags.Format<"password">
  const joinPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  // 2. Customer join (also establishes initial authenticated customer context)
  const customerJoinBody = {
    email: customerEmail,
    password: joinPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 3. Seller join and login
  const sellerJoinBody = {
    email: sellerEmail,
    password: joinPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorizedOnJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedOnJoin);

  // Explicit login to exercise login endpoint and ensure we can swap actors later
  const sellerLoginBody = {
    email: sellerEmail,
    password: joinPassword,
    ip: null,
    href: "https://shoppingmall.local/seller/login" as string &
      tags.Format<"uri">,
    referrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerAuthorizedOnLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedOnLogin);

  // 4. Admin join and login
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorizedOnJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedOnJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://shoppingmall.local/admin/login" as string &
      tags.Format<"uri">,
    referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminAuthorizedOnLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedOnLogin);

  // 5. As admin: create a purchasable inventory state
  const inventoryStateBody = {
    code: `state-${RandomGenerator.alphaNumeric(8)}`,
    name: "Purchasable State",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 6. As admin: create a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 7. Switch to seller: login again to ensure seller context is active
  const sellerAuthorizedForCatalog: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedForCatalog);

  // 8. As seller: create a product
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri:
      "https://shoppingmall.local/images/product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 9. Switch back to admin to associate product with category
  const adminAuthorizedForCatalog: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedForCatalog);

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
  TestValidator.equals(
    "product category links to correct product",
    productCategory.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "product category links to correct category",
    productCategory.shopping_mall_category_id,
    category.id,
  );

  // 10. Switch to seller again to create a SKU under the product
  const sellerAuthorizedForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedForSku);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);
  TestValidator.equals(
    "sku product summary id matches product",
    sku.product.id,
    product.id,
  );
  TestValidator.equals(
    "sku inventory state summary id matches inventory state",
    sku.inventory_state.id,
    inventoryState.id,
  );

  // 11. Switch back to customer: login to ensure fresh customer context
  const customerLoginBody = {
    email: customerEmail,
    password: joinPassword,
    ip: null,
    href: "https://shoppingmall.local/customer/login" as string &
      tags.Format<"uri">,
    referrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAuthorizedOnLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorizedOnLogin);

  // 12. As customer: create a wishlist
  const wishlistBody = {
    name: "Favorites",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);
  TestValidator.equals(
    "wishlist belongs to logged-in customer",
    wishlist.customer.id,
    customerAuthorizedOnLogin.id,
  );

  // 13. As customer: create a wishlist item referencing the product and SKU
  const wishlistItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: null,
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
  TestValidator.equals(
    "wishlist item references correct wishlist",
    wishlistItem.shopping_mall_wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist item references correct product",
    wishlistItem.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "wishlist item references correct sku",
    wishlistItem.shopping_mall_sku_id,
    sku.id,
  );

  // 14. Happy-path delete: as same customer, erase the wishlist item
  await api.functional.shoppingMall.customer.wishlists.items.erase(connection, {
    wishlistId: wishlist.id as string & tags.Format<"uuid">,
    wishlistItemId: wishlistItem.id as string & tags.Format<"uuid">,
  });

  // If we reached here without exception, consider delete success from E2E POV.
  await TestValidator.predicate(
    "wishlist item delete completed without throwing",
    async () => true,
  );
}
