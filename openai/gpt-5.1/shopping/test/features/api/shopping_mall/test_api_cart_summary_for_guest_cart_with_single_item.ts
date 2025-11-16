import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCartSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummary";
import type { IShoppingMallCartSummaryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummaryItem";
import type { IShoppingMallCartSummaryItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummaryItemOption";
import type { IShoppingMallCartSummaryMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummaryMessage";
import type { IShoppingMallCartSummaryTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSummaryTotals";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
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

export async function test_api_cart_summary_for_guest_cart_with_single_item(
  connection: api.IConnection,
) {
  // 1. Platform admin join and login for brand creation
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(2),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logos/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join and login for catalog operations
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com`,
    password: "P@ssw0rd!",
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile("010"),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. Create a product for this seller, associated with the brand
  const productCode = `PRD-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 3 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/products/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create an option type under this product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 6. Create an option value under this option type
  const optionValueCreateBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 7. Create a SKU for this product
  const skuCurrency = "USD";
  const skuListPrice = 100;
  const skuSalePrice = 80;

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `${product.name} - Blue`,
    listPrice: skuListPrice,
    salePrice: skuSalePrice,
    currency: skuCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 8. Create a guest cart
  const regionCode = "US";
  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "192.168.0.10",
    user_agent: "Mozilla/5.0 (Test E2E)",
    referrer: "https://shoppingmall.test/products/" + product.code,
    region_code: regionCode,
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 9. Add a single guest cart item
  const quantity = 2;
  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const guestCartItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemCreateBody,
    });
  typia.assert(guestCartItem);

  // 10. Call cart summary (using the same connection; headers are managed by SDK)
  const summaryRequestBody = {
    region_code: regionCode,
    currency_code: sku.currency,
    include_promotions: false,
    include_shipping_estimate: false,
    include_diagnostics: false,
  } satisfies IShoppingMallCartSummary.IRequest;

  const summary: IShoppingMallCartSummary =
    await api.functional.shoppingMall.carts.summary.index(connection, {
      body: summaryRequestBody,
    });
  typia.assert(summary);

  // 11. Validate cart summary business logic
  // Ensure currency matches SKU currency
  TestValidator.equals(
    "summary currency matches SKU currency",
    summary.currency,
    sku.currency,
  );

  // Validate items length is exactly 1
  TestValidator.equals(
    "cart summary has exactly one item",
    summary.items.length,
    1,
  );

  const item: IShoppingMallCartSummaryItem = summary.items[0];

  // Validate quantity
  TestValidator.equals(
    "summary item quantity matches cart item quantity",
    item.quantity,
    quantity,
  );

  // Validate unitPrice and line totals assuming unitPrice == sku.salePrice
  TestValidator.equals(
    "unitPrice equals SKU salePrice",
    item.unitPrice,
    sku.salePrice,
  );

  const expectedLineSubtotal = item.unitPrice * item.quantity;
  TestValidator.equals(
    "lineSubtotal equals unitPrice * quantity",
    item.lineSubtotal,
    expectedLineSubtotal,
  );

  if (item.lineDiscountTotal === null || item.lineDiscountTotal === undefined) {
    TestValidator.equals(
      "lineTotal equals lineSubtotal when no discount",
      item.lineTotal,
      item.lineSubtotal,
    );
  }

  // Validate availability
  TestValidator.predicate(
    "item is available for purchase",
    item.isAvailable === true,
  );

  // Totals-level validation
  const totals: IShoppingMallCartSummaryTotals = summary.totals;
  TestValidator.equals("totals.itemCount is 1", totals.itemCount, 1);
  TestValidator.equals(
    "totals.quantityTotal equals item quantity",
    totals.quantityTotal,
    item.quantity,
  );
  TestValidator.equals(
    "totals.subtotal equals lineSubtotal",
    totals.subtotal,
    item.lineSubtotal,
  );

  const noDiscount =
    totals.discountTotal === null || totals.discountTotal === undefined;
  const noShipping =
    totals.shippingEstimate === null || totals.shippingEstimate === undefined;
  const noTax = totals.taxEstimate === null || totals.taxEstimate === undefined;

  if (noDiscount && noShipping && noTax) {
    TestValidator.equals(
      "grandTotal equals subtotal when no discount/shipping/tax",
      totals.grandTotal,
      totals.subtotal,
    );
  }

  // hasErrors and errors array
  TestValidator.equals(
    "summary.hasErrors is false for simple in-stock cart",
    summary.hasErrors,
    false,
  );

  const errors: IShoppingMallCartSummaryMessage[] | undefined = summary.errors;
  if (errors !== undefined && errors !== null) {
    TestValidator.equals(
      "errors array is empty when hasErrors is false",
      errors.length,
      0,
    );
  }
}
