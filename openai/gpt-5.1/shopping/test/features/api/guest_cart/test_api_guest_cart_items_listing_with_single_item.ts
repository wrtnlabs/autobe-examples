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
 * Validate listing items of a guest cart that contains exactly one line item.
 *
 * Business flow:
 *
 * 1. Bootstrap required actors:
 *
 *    - Join & login as a platform admin to create a brand
 *    - Join & login as a seller to create catalog entities
 * 2. Catalog setup:
 *
 *    - Platform admin creates a Brand
 *    - Seller creates a Product (optionally linked to the Brand)
 *    - Seller creates a SKU under that Product, marked active & purchasable
 * 3. Guest cart lifecycle:
 *
 *    - Anonymous visitor creates a guest cart
 *    - Visitor adds a single line item using the SKU
 *    - Visitor lists items via PATCH /shoppingMall/guestCarts/{guestCartId}/items
 * 4. Assertions:
 *
 *    - Pagination metadata reflects exactly one record
 *    - Data length is 1
 *    - Item summary matches the created SKU/product and quantity
 */
export async function test_api_guest_cart_items_listing_with_single_item(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins
  const sellerEmail =
    `${RandomGenerator.alphabets(8)}@seller.example.com` as string;
  const sellerJoinBody = {
    email: sellerEmail as string & tags.Format<"email">,
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller login (to ensure auth context is correct)
  const sellerLoginBody = {
    email: sellerEmail as string & tags.Format<"email">,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10) as string &
    tags.MinLength<1>;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Seller creates a SKU under the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. Guest creates a guest cart (unauthenticated context)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "192.0.2.1",
    user_agent: "Mozilla/5.0 (E2E GuestCart Test)",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(guestConnection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 8. Guest adds a single cart item
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(guestConnection, {
      guestCartId: guestCart.id,
      body: guestCartItemCreateBody,
    });
  typia.assert(createdItem);

  // 9. List items via PATCH /shoppingMall/guestCarts/{guestCartId}/items
  const page: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(guestConnection, {
      guestCartId: guestCart.id,
    });
  typia.assert(page);

  // 10. Assertions on pagination
  const pagination = page.pagination;
  TestValidator.equals(
    "pagination.current should be 0 for first page",
    pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination.limit should be at least 1",
    pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination.records should be 1 when there is a single item",
    pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination.pages should be 1 when there is a single item",
    pagination.pages,
    1,
  );

  // 11. Assertions on data array
  TestValidator.equals("data length should be exactly 1", page.data.length, 1);

  const summary: IShoppingMallGuestCartItem.ISummary = page.data[0];
  typia.assert(summary);

  // 12. Assert linkage and quantities
  TestValidator.equals(
    "guest_cart_id in summary should match created guest cart id",
    summary.guest_cart_id,
    guestCart.id,
  );

  TestValidator.equals(
    "summary.quantity should match the requested quantity",
    summary.quantity,
    quantity,
  );

  // sku and product linkage
  if (summary.sku_id !== undefined) {
    TestValidator.equals(
      "summary.sku_id should equal the created SKU id",
      summary.sku_id,
      sku.id,
    );
  }

  if (summary.product_id !== undefined) {
    TestValidator.equals(
      "summary.product_id should equal the created product id",
      summary.product_id,
      product.id,
    );
  }

  TestValidator.equals(
    "summary.sku.id should equal the created SKU id",
    summary.sku.id,
    sku.id,
  );
  TestValidator.equals(
    "summary.product.id should equal the created product id",
    summary.product.id,
    product.id,
  );

  // currency and naming
  TestValidator.equals(
    "currency_code should match SKU currency",
    summary.currency_code,
    sku.currency,
  );
  TestValidator.equals(
    "product_name should equal product.name",
    summary.product_name,
    product.name,
  );
  TestValidator.equals(
    "sku_name should equal sku.name",
    summary.sku_name,
    sku.name,
  );

  // created_at / updated_at presence is already validated via typia.assert,
  // but we additionally ensure they are non-empty strings.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof summary.created_at === "string" && summary.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof summary.updated_at === "string" && summary.updated_at.length > 0,
  );
}
