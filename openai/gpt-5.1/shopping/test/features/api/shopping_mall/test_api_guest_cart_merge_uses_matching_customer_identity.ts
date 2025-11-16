import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallGuestCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartMerge";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_guest_cart_merge_uses_matching_customer_identity(
  connection: api.IConnection,
) {
  // 0. Helper to build a basic URL for href/referrer fields
  const origin = "https://example.com" as const;

  // 1. Register and login a platform admin, then create a brand
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: `${origin}/admin/join`,
    referrer: `${origin}/landing`,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: `${origin}/assets/brand-${RandomGenerator.alphaNumeric(6)}.png`,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 2. Register a seller, login, create product and SKU
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const productCode = `PRD-${RandomGenerator.alphaNumeric(8)}`;

  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: `${origin}/assets/product-${RandomGenerator.alphaNumeric(6)}.jpg`,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: `Variant ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 3. Create a guest cart and add an item
  const guestToken = `guest-${RandomGenerator.alphaNumeric(12)}`;

  const guestCartBody = {
    guest_token: guestToken,
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (e2e-test)",
    referrer: `${origin}/product/${product.code}`,
    region_code: "KR-Seoul",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  const guestItemQuantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2;

  const guestCartItemBody = {
    sku_id: sku.id,
    quantity: guestItemQuantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const guestItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemBody,
    });
  typia.assert(guestItem);

  // 4. Register two different customers A and B
  const baseCustomerPassword = RandomGenerator.alphaNumeric(12);

  const customerAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: baseCustomerPassword,
    name: `CustomerA ${RandomGenerator.name(1)}`,
    ip: "127.0.0.1",
    href: `${origin}/join`,
    referrer: `${origin}/landing`,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuthorized);

  const customerALoginEmail = customerAAuthorized.email;

  const customerBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: baseCustomerPassword,
    name: `CustomerB ${RandomGenerator.name(1)}`,
    ip: "127.0.0.1",
    href: `${origin}/join`,
    referrer: `${origin}/landing`,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuthorized);

  const customerBLoginEmail = customerBAuthorized.email;

  // 5. Create a persistent cart for customer A
  // Ensure we are authenticated as customer A again
  const customerALoginBody = {
    email: customerALoginEmail,
    password: baseCustomerPassword,
    ip: "127.0.0.1",
    href: `${origin}/login`,
    referrer: `${origin}/landing`,
    userAgent: "Mozilla/5.0 (e2e-test)",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const reloginA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(reloginA);

  const customerACartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "guest-merge-identity",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerACart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerACartBody,
      },
    );
  typia.assert(customerACart);

  // 6. Attempt to merge guest cart while authenticated as customer B (should fail)
  const customerBLoginBody = {
    email: customerBLoginEmail,
    password: baseCustomerPassword,
    ip: "127.0.0.1",
    href: `${origin}/login`,
    referrer: `${origin}/landing`,
    userAgent: "Mozilla/5.0 (e2e-test)",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const reloginB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(reloginB);

  const mergeBodyForB = {
    guest_cart_id: guestCart.id,
    merge_strategy: "sum-quantities",
  } satisfies IShoppingMallGuestCartMerge.ICreate;

  await TestValidator.error(
    "other customer cannot merge guest cart they do not own",
    async () => {
      await api.functional.shoppingMall.customer.guestCarts.mergeIntoCustomer.create(
        connection,
        {
          body: mergeBodyForB,
        },
      );
    },
  );

  // 7. Perform the merge as customer A (should succeed)
  const reloginA2Body = {
    email: customerALoginEmail,
    password: baseCustomerPassword,
    ip: "127.0.0.1",
    href: `${origin}/login`,
    referrer: `${origin}/landing`,
    userAgent: "Mozilla/5.0 (e2e-test)",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const reloginA2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: reloginA2Body,
    });
  typia.assert(reloginA2);

  const mergeBodyForA = {
    guest_cart_id: guestCart.id,
    merge_strategy: "sum-quantities",
  } satisfies IShoppingMallGuestCartMerge.ICreate;

  const mergedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.guestCarts.mergeIntoCustomer.create(
      connection,
      {
        body: mergeBodyForA,
      },
    );
  typia.assert(mergedCart);

  TestValidator.equals(
    "merged cart belongs to customer A",
    mergedCart.customer.id,
    reloginA2.customer.id,
  );

  // 8. Validate that customer A's cart has the SKU from the guest cart
  const itemsRequestForA = {
    page: 0,
    limit: 50,
    sku_code: undefined,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallCustomerCartItem.IRequest;

  const itemsPageA: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.customer.customerCarts.items.index(
      connection,
      {
        customerCartId: mergedCart.id,
        body: itemsRequestForA,
      },
    );
  typia.assert(itemsPageA);

  TestValidator.predicate(
    "merged cart has at least one item",
    itemsPageA.data.length > 0,
  );

  const matchingItemA = itemsPageA.data.find((item) => item.skuId === sku.id);

  TestValidator.predicate(
    "merged cart contains the SKU from guest cart",
    matchingItemA !== undefined,
  );

  if (matchingItemA !== undefined) {
    TestValidator.equals(
      "merged quantity matches guest cart quantity",
      matchingItemA.quantity,
      guestItemQuantity,
    );
  }

  // 9. Ensure that customer B's cart (created after failed merge) is empty
  const reloginB2Body = {
    email: customerBLoginEmail,
    password: baseCustomerPassword,
    ip: "127.0.0.1",
    href: `${origin}/login`,
    referrer: `${origin}/landing`,
    userAgent: "Mozilla/5.0 (e2e-test)",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const reloginB2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: reloginB2Body,
    });
  typia.assert(reloginB2);

  const customerBCartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "guest-merge-identity",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerBCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerBCartBody,
      },
    );
  typia.assert(customerBCart);

  const itemsRequestForB = {
    page: 0,
    limit: 50,
    sku_code: undefined,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallCustomerCartItem.IRequest;

  const itemsPageB: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.customer.customerCarts.items.index(
      connection,
      {
        customerCartId: customerBCart.id,
        body: itemsRequestForB,
      },
    );
  typia.assert(itemsPageB);

  TestValidator.equals(
    "customer B's new cart should be empty (no side-effect from failed merge)",
    itemsPageB.data.length,
    0,
  );
}
