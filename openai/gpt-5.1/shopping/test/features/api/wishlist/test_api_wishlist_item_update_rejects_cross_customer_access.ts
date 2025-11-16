import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_item_update_rejects_cross_customer_access(
  connection: api.IConnection,
) {
  // 1. Register core actors: platform admin, seller, customer A, customer B
  const platformAdminJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@admin.test.com",
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const sellerJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@seller.test.com",
    password: "SellerPass123!",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const customerAEmail = RandomGenerator.alphaNumeric(8) + "@customer.test.com";
  const customerAPassword = "CustomerAPass123!";
  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuth);

  const customerBEmail = RandomGenerator.alphaNumeric(8) + "@customer.test.com";
  const customerBPassword = "CustomerBPass123!";
  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuth);

  // 2. Catalog prerequisites as platform admin and seller
  // Switch context to platform admin (join already set Authorization)
  const categoryTreeBody = {
    code: "tree-" + RandomGenerator.alphaNumeric(8),
    name: "Main Catalog " + RandomGenerator.alphaNumeric(4),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: "Brand " + RandomGenerator.alphaNumeric(6),
    slug: "brand-" + RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.test.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Switch context to seller (seller.join already set Authorization)
  const sellerProductBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: "prod-" + RandomGenerator.alphaNumeric(8),
    name: "Wishlist Product " + RandomGenerator.alphaNumeric(4),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.test.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  const skuBody = {
    code: "sku-" + RandomGenerator.alphaNumeric(8),
    name: "Red Variant",
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 3. Customer A wishlist and wishlist item
  // After customerA.join, connection already has Customer A token, but
  // seller.join and platformAdmin.join also overwrote it. Re-login as A.
  const customerALoginBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/home",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerALogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALogin);

  const wishlistBody = {
    name: "Customer A Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  const wishlistItemCreateBody = {
    shopping_mall_product_id: sellerProduct.id,
    shopping_mall_product_sku_id: sku.id,
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

  // 4. Cross-customer update attempt as Customer B
  const customerBLoginBody = {
    email: customerBEmail,
    password: customerBPassword,
    ip: null,
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/home",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerBLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLogin);

  const crossCustomerUpdateBody = {
    shopping_mall_product_id: sellerProduct.id,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.IUpdate;

  await TestValidator.error(
    "cross-customer cannot update another customer's wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        connection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistItem.id,
          body: crossCustomerUpdateBody,
        },
      );
    },
  );

  // 5. Switch back to Customer A and perform a legitimate update
  const customerALoginAgainBody = {
    email: customerAEmail,
    password: customerAPassword,
    ip: null,
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/home",
    userAgent: "e2e-test-agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerALoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginAgainBody,
    });
  typia.assert(customerALoginAgain);

  const ownerUpdateBody = {
    shopping_mall_product_id: sellerProduct.id,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.IUpdate;
  const updatedByOwner: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.update(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistItem.id,
        body: ownerUpdateBody,
      },
    );
  typia.assert(updatedByOwner);

  TestValidator.equals(
    "owner update preserves wishlist and item identity",
    updatedByOwner.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "owner update keeps item bound to same wishlist",
    updatedByOwner.wishlist_id,
    wishlist.id,
  );

  // 6. Anonymous caller attempt using a separate unauthenticated connection
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const anonymousUpdateBody = {
    shopping_mall_product_id: sellerProduct.id,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.IUpdate;

  await TestValidator.error(
    "anonymous caller cannot update wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        unauthConnection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistItem.id,
          body: anonymousUpdateBody,
        },
      );
    },
  );
}
