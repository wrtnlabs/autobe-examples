import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_item_update_remove_sku_to_product_level(
  connection: api.IConnection,
) {
  // 1. Prepare distinct emails for each actor
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const otherCustomerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const href: string = "https://frontend.shoppingmall.test/join";
  const referrer: string = "https://frontend.shoppingmall.test/landing";

  // 2. Join and login as customer (owner)
  const joinedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Password123!",
        href,
        referrer,
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(joinedCustomer);

  // Explicit login step (even though join already authenticated) to
  // mirror realistic flows
  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "Password123!",
        href: "https://frontend.shoppingmall.test/login",
        referrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(loggedInCustomer);

  // 3. Join/login as seller
  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Password123!",
        href,
        referrer,
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(joinedSeller);

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "Password123!",
        href: "https://frontend.shoppingmall.test/seller/login",
        referrer,
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(loggedInSeller);

  // 4. Join/login as admin
  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Password123!",
        href,
        referrer,
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(joinedAdmin);

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "Password123!",
        href: "https://frontend.shoppingmall.test/admin/login",
        referrer,
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert(loggedInAdmin);

  // 5. As admin, create an inventory state used by the SKU
  const inventoryStateCreate = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreate,
      },
    );
  typia.assert(inventoryState);

  // 6. Switch back to seller (auth API manages token switching)
  const reloggedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "Password123!",
        href: "https://frontend.shoppingmall.test/seller/catalog",
        referrer,
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(reloggedSeller);

  // 7. Seller creates a product
  const productCreate = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/product-main.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);

  // 8. Seller creates a SKU under the product referencing the inventory state
  const skuCreate = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [
      {
        system_code: "WMS",
        external_id: `EXT-${RandomGenerator.alphaNumeric(10)}`,
      } satisfies IShoppingMallSkuExternalId.ICreate,
    ],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreate,
    });
  typia.assert(sku);

  // 9. Switch to customer context again (owner customer)
  const reloggedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "Password123!",
        href: "https://frontend.shoppingmall.test/customer/wishlists",
        referrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(reloggedCustomer);

  // 10. Customer creates a wishlist
  const wishlistCreate = {
    name: "Favorites",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreate,
    });
  typia.assert(wishlist);

  // 11. Customer creates a wishlist item pointing to product + sku
  const wishlistItemCreate = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: 1,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemCreate,
      },
    );
  typia.assert(wishlistItem);

  TestValidator.equals(
    "wishlist item initially has sku bound",
    wishlistItem.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "wishlist item initially product matches",
    wishlistItem.shopping_mall_product_id,
    product.id,
  );

  // 12. Update wishlist item: remove SKU (set to null), omit position
  const updateBody: IShoppingMallWishlistItem.IUpdate = {
    shopping_mall_sku_id: null,
  };

  const updatedItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.update(
      connection,
      {
        wishlistId: wishlist.id as string & tags.Format<"uuid">,
        wishlistItemId: wishlistItem.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedItem);

  TestValidator.equals(
    "updated wishlist item sku id is null",
    updatedItem.shopping_mall_sku_id,
    null,
  );
  TestValidator.equals(
    "updated wishlist item product id unchanged",
    updatedItem.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "sku summary is null when sku id removed (if present)",
    updatedItem.sku ?? null,
    null,
  );

  // 13. Ownership/authorization: another customer must not update this item
  const otherJoinedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: otherCustomerEmail,
        password: "Password123!",
        href,
        referrer,
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(otherJoinedCustomer);

  const otherLoggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: otherCustomerEmail,
        password: "Password123!",
        href: "https://frontend.shoppingmall.test/customer/login",
        referrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(otherLoggedInCustomer);

  await TestValidator.error(
    "other customer cannot update foreign wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        connection,
        {
          wishlistId: wishlist.id as string & tags.Format<"uuid">,
          wishlistItemId: wishlistItem.id as string & tags.Format<"uuid">,
          body: {
            shopping_mall_sku_id: null,
          },
        },
      );
    },
  );
}
