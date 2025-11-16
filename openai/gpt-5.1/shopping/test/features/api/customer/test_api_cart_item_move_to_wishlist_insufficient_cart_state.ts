import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
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

export async function test_api_cart_item_move_to_wishlist_insufficient_cart_state(
  connection: api.IConnection,
) {
  // 1. Prepare base URLs and helper values
  const baseHref = "https://example.com/join" as const;
  const baseReferrer = "https://example.com/" as const;

  // 2. Register platform admin and login (single step join is enough because it sets token)
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 3. Register seller and login (join sets token implicitly)
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. As platform admin, create brand
  // (platform admin token is already set from step 2; seller.join overwrote it, so re-login admin)
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const reloggedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(reloggedAdmin);

  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: `https://cdn.example.com/logo/${RandomGenerator.alphabets(8)}.png`,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Create product under seller using platformAdmin.products (needs seller id)
  const productCode = `PRD-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: seller.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: `https://cdn.example.com/product/${RandomGenerator.alphabets(8)}.jpg`,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // 6. As seller, re-login and create option type + value under the product
  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallSellerLogin.IRequest;
  const reloggedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(reloggedSeller);

  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
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
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 7. As platform admin, login again and create a SKU under the product
  const reloggedAdmin2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(reloggedAdmin2);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 8. Register Customer A and B via auth.customer.join
  const customerAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerA);

  const customerBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerB);

  // 9. As Customer A, create a cart and add one item
  const customerALoginBody = {
    email: customerA.email,
    password: customerAJoinBody.password,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const reloggedCustomerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(reloggedCustomerA);

  const cartABody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartABody,
      },
    );
  typia.assert(cartA);

  const cartAItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Customer A item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartAItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartA.id,
        body: cartAItemBody,
      },
    );
  typia.assert(cartAItem);

  // Create optional wishlist for Customer A
  const wishlistABody = {
    name: "Customer A Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistABody,
    });
  typia.assert(wishlistA);

  // 10. As Customer B, create own cart and wishlist to mirror normal usage
  const customerBLoginBody = {
    email: customerB.email,
    password: customerBJoinBody.password,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const reloggedCustomerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(reloggedCustomerB);

  const cartBBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cartB: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBBody,
      },
    );
  typia.assert(cartB);

  const wishlistBBody = {
    name: "Customer B Wishlist",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlistB: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBBody,
    });
  typia.assert(wishlistB);

  // 11. While authenticated as Customer B, attempt to move Customer A's item
  await TestValidator.error(
    "moving another customer's cart item to wishlist must fail",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.items.moveToWishlist(
        connection,
        {
          customerCartId: cartA.id,
          customerCartItemId: cartAItem.id,
        },
      );
    },
  );

  // Validate that local DTOs are still structurally correct (cannot re-fetch but can assert types)
  typia.assert(cartA);
  typia.assert(cartAItem);
  typia.assert(cartB);
  typia.assert(wishlistA);
  typia.assert(wishlistB);

  TestValidator.predicate(
    "customer A and B carts are distinct aggregates in test context",
    cartA.id !== cartB.id,
  );
}
