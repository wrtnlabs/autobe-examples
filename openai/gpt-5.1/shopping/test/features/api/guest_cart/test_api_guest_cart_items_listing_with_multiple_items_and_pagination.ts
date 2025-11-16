import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate listing of guest cart items and pagination metadata for a guest cart
 * containing multiple items.
 *
 * Business flow:
 *
 * 1. Register and login a platform admin, then create a brand.
 * 2. Register and login a seller, then create two products under the brand and one
 *    active, purchasable SKU per product.
 * 3. Create a guest cart and add two items referencing different SKUs with
 *    different quantities.
 * 4. Invoke the guest cart items index endpoint to retrieve a paginated list of
 *    items.
 * 5. Assert pagination metadata consistency and that all listed items match the
 *    SKUs and quantities added, including basic monetary consistency checks.
 */
export async function test_api_guest_cart_items_listing_with_multiple_items_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login platform admin
  const platformAdminJoinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoined);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create a brand as platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.shoppingmall.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Register and login seller
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Create two products as seller
  const productCode1 = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const productCode2 = `PROD-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody1 = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode1 as string & tags.MinLength<1>,
    name: `Product A ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.example.com/product-a.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productCreateBody2 = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode2 as string & tags.MinLength<1>,
    name: `Product B ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.example.com/product-b.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody1,
    });
  typia.assert(product1);

  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody2,
    });
  typia.assert(product2);

  // 5. Create SKUs for each product
  const skuCreateBody1 = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: `SKU for ${product1.name}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuCreateBody2 = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: `SKU for ${product2.name}`,
    listPrice: 20000,
    salePrice: 18000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product1.code,
      body: skuCreateBody1,
    });
  typia.assert(sku1);

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product2.code,
      body: skuCreateBody2,
    });
  typia.assert(sku2);

  // 6. Create guest cart
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "E2E-Test-Agent/1.0",
    referrer: "https://shoppingmall.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 7. Add two items with different SKUs into the guest cart
  const quantity1: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const quantity2: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const itemCreateBody1 = {
    sku_id: sku1.id,
    quantity: quantity1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const itemCreateBody2 = {
    sku_id: sku2.id,
    quantity: quantity2,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const item1: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: itemCreateBody1,
    });
  typia.assert(item1);

  const item2: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: itemCreateBody2,
    });
  typia.assert(item2);

  // 8. List guest cart items via PATCH index endpoint
  const page: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(connection, {
      guestCartId: guestCart.id,
    });
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  const data = page.data;

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination limit should be non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    () => pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= number of returned items",
    () => pagination.records >= data.length,
  );

  if (pagination.records > 0) {
    TestValidator.equals(
      "current page should be 0 when records exist",
      pagination.current,
      0 as number,
    );
  }

  // We expect at least the two items we just added to be present
  TestValidator.predicate(
    "at least two items should exist in guest cart",
    () => pagination.records >= 2,
  );

  // Build expectation map for quantities by sku_id
  const expectedQuantities = new Map<string, number>();
  expectedQuantities.set(sku1.id, quantity1);
  expectedQuantities.set(sku2.id, quantity2);

  // 9. Validate that all items on the current page correspond to added SKUs and have consistent monetary values
  for (const summary of data) {
    const skuId = summary.sku.id;

    TestValidator.predicate("summary sku id must be one of created skus", () =>
      expectedQuantities.has(skuId),
    );

    const expectedQty = expectedQuantities.get(skuId);
    if (expectedQty !== undefined) {
      TestValidator.equals(
        "summary quantity matches expected",
        summary.quantity,
        expectedQty,
      );
    }

    // Monetary checks: unit_price * quantity === line_subtotal
    TestValidator.equals(
      "line_subtotal equals unit_price * quantity",
      summary.line_subtotal,
      summary.unit_price * summary.quantity,
    );

    TestValidator.predicate(
      "line_total should not exceed line_subtotal",
      () => summary.line_total <= summary.line_subtotal,
    );

    // Currency consistency with sku summary
    TestValidator.equals(
      "currency_code aligns with sku.currencyCode",
      summary.currency_code,
      summary.sku.currencyCode,
    );

    // Product and sku name consistency (basic sanity checks)
    TestValidator.equals(
      "product_name matches product summary name",
      summary.product_name,
      summary.product.name,
    );

    TestValidator.predicate(
      "sku_name should be a non-empty string",
      () => summary.sku_name.length > 0,
    );
  }
}
