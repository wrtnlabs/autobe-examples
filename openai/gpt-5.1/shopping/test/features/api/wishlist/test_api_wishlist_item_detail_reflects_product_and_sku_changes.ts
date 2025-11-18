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

export async function test_api_wishlist_item_detail_reflects_product_and_sku_changes(
  connection: api.IConnection,
) {
  // 1. Customer join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoin);

  // Explicit login to ensure we test login as well
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 2. Create wishlist as customer
  const wishlistCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // 3. Seller join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // Explicit seller login to ensure connection token is seller-scoped
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. Create product as seller
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalSummary = RandomGenerator.paragraph({ sentences: 4 });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: originalTitle,
    summary: originalSummary,
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // Explicit admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 6. Create SKU inventory state as admin
  const skuInventoryStateCreateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // 7. Back to seller and create SKU
  const sellerLoginForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/sku-login",
        referrer: "https://seller.example.com/landing",
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLoginForSku);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: typia.random<number & tags.Minimum<0>>() satisfies number &
      tags.Minimum<0>,
    original_price: null,
    inventory_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 8. Back to customer and create wishlist item
  const customerLoginForWishlist: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://customer.example.com/wishlist-login",
        referrer: "https://customer.example.com/landing",
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(customerLoginForWishlist);

  const wishlistItemCreateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert(wishlistItem);

  TestValidator.equals(
    "wishlist item belongs to wishlist",
    wishlistItem.shopping_mall_wishlist_id,
    wishlist.id,
  );

  // 9. First read of wishlist item detail
  const itemBefore: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.at(connection, {
      wishlistId: wishlist.id,
      wishlistItemId: wishlistItem.id,
    });
  typia.assert(itemBefore);

  TestValidator.equals(
    "itemBefore.id equals created wishlistItem.id",
    itemBefore.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "itemBefore.wishlist id matches",
    itemBefore.shopping_mall_wishlist_id,
    wishlist.id,
  );

  TestValidator.predicate(
    "itemBefore.product must be defined",
    itemBefore.product !== undefined,
  );

  if (itemBefore.product !== undefined) {
    TestValidator.equals(
      "itemBefore.product.id equals product.id",
      itemBefore.product.id,
      product.id,
    );
  }

  TestValidator.predicate(
    "itemBefore.sku must be defined",
    itemBefore.sku !== undefined && itemBefore.sku !== null,
  );

  let skuCodeBefore: string | null = null;
  if (itemBefore.sku !== undefined && itemBefore.sku !== null) {
    skuCodeBefore = itemBefore.sku.code;

    TestValidator.equals(
      "itemBefore.sku.id equals sku.id",
      itemBefore.sku.id,
      sku.id,
    );
    TestValidator.equals(
      "itemBefore.sku.code equals sku.code",
      itemBefore.sku.code,
      sku.code,
    );
  }

  // 10. Mutate product and SKU as seller
  const sellerLoginForUpdate: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller.example.com/update-login",
        referrer: "https://seller.example.com/landing",
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLoginForUpdate);

  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newSummary = RandomGenerator.paragraph({ sentences: 4 });

  const productUpdateBody = {
    title: newTitle,
    summary: newSummary,
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: product.id,
      body: productUpdateBody,
    });
  typia.assert(updatedProduct);

  TestValidator.equals(
    "updatedProduct.id equals product.id",
    updatedProduct.id,
    product.id,
  );

  const newSkuCode = RandomGenerator.alphaNumeric(12);

  const skuUpdateBody = {
    code: newSkuCode,
  } satisfies IShoppingMallSku.IUpdate;

  const updatedSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productId: product.id,
      skuId: sku.id,
      body: skuUpdateBody,
    });
  typia.assert(updatedSku);

  TestValidator.equals("updatedSku.id equals sku.id", updatedSku.id, sku.id);
  TestValidator.equals(
    "updatedSku.code equals newSkuCode",
    updatedSku.code,
    newSkuCode,
  );

  // 11. Second read of wishlist item detail
  const customerLoginForVerify: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://customer.example.com/verify-login",
        referrer: "https://customer.example.com/landing",
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(customerLoginForVerify);

  const itemAfter: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.at(connection, {
      wishlistId: wishlist.id,
      wishlistItemId: wishlistItem.id,
    });
  typia.assert(itemAfter);

  TestValidator.equals(
    "itemAfter.id equals wishlistItem.id",
    itemAfter.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "itemAfter.wishlist id matches",
    itemAfter.shopping_mall_wishlist_id,
    wishlist.id,
  );

  TestValidator.predicate(
    "itemAfter.product must be defined",
    itemAfter.product !== undefined,
  );
  if (itemAfter.product !== undefined) {
    TestValidator.equals(
      "itemAfter.product.id equals product.id",
      itemAfter.product.id,
      product.id,
    );
  }

  TestValidator.predicate(
    "itemAfter.sku must be defined",
    itemAfter.sku !== undefined && itemAfter.sku !== null,
  );

  if (itemAfter.sku !== undefined && itemAfter.sku !== null) {
    TestValidator.equals(
      "itemAfter.sku.id equals sku.id",
      itemAfter.sku.id,
      sku.id,
    );

    TestValidator.equals(
      "itemAfter.sku.code reflects updated SKU code",
      itemAfter.sku.code,
      newSkuCode,
    );

    if (skuCodeBefore !== null) {
      TestValidator.notEquals(
        "SKU code in summary should differ from original after update",
        itemAfter.sku.code,
        skuCodeBefore,
      );
    }
  }
}
