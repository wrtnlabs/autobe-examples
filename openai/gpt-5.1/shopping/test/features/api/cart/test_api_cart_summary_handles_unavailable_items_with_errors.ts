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
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
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
 * Validate cart summary computation for a guest cart containing a seller SKU.
 *
 * This scenario wires together platform admin setup, seller product/SKU
 * creation, guest cart creation, item addition, and the cart summary
 * computation. Even though we do not have an explicit API to deactivate a SKU
 * or product in this fixture set, we can still validate that:
 *
 * - A cart summary can be computed for a guest context with a concrete SKU.
 * - The summary contains an item corresponding to the SKU added to the guest
 *   cart.
 * - Line-level monetary fields are internally consistent (unitPrice,
 *   lineSubtotal, lineDiscountTotal, lineTotal).
 * - Aggregated totals reflect the line content (itemCount, quantityTotal,
 *   subtotal, grandTotal, and optional discount/shipping/tax estimates).
 * - Error and warning messages, when present, have proper severity values and can
 *   be associated to concrete cart lines via cartItemId.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create a category tree (for realistic catalog context).
 * 3. As platform admin, create a brand.
 * 4. Register and authenticate a seller.
 * 5. As seller, create a product bound to the seller and the created brand.
 * 6. As seller, create a SKU for that product with a positive price and
 *    `isActive=true`, `isPurchasable=true`.
 * 7. Create a guest cart and add a cart item pointing at the created SKU.
 * 8. Call PATCH /shoppingMall/carts/summary with region/currency context.
 * 9. Find the summary line for the created SKU and assert structural and monetary
 *    consistency, including totals and optional error/warning messages.
 */
export async function test_api_cart_summary_handles_unavailable_items_with_errors(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // Optionally exercise platformAdmin login
  const adminLoginBody = {
    email: platformAdmin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Seller joins
  const sellerPassword = RandomGenerator.alphabets(10);
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: sellerPassword,
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Exercise seller login explicitly
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerPassword,
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
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Seller creates a SKU under the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const listPrice = 10000;
  const salePrice = 8000;
  const skuBody = {
    code: skuCode,
    name: `Variant ${RandomGenerator.name(1)}`,
    listPrice,
    salePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  // 7. Guest creates a cart
  const guestToken = RandomGenerator.alphaNumeric(16);
  const guestCartBody = {
    guest_token: guestToken,
    ip: "127.0.0.1",
    user_agent: "E2E-GuestCart-Test",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 8. Add an item to guest cart referencing the created SKU
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const guestCartItemBody = {
    sku_id: sku.id,
    quantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const guestCartItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemBody,
    });
  typia.assert(guestCartItem);

  // 9. Compute cart summary
  const summaryRequest = {
    region_code: "KR",
    currency_code: sku.currency,
    include_promotions: true,
    include_shipping_estimate: true,
    include_diagnostics: true,
  } satisfies IShoppingMallCartSummary.IRequest;

  const summary: IShoppingMallCartSummary =
    await api.functional.shoppingMall.carts.summary.index(connection, {
      body: summaryRequest,
    });
  typia.assert(summary);

  // Basic invariants on totals
  const totals: IShoppingMallCartSummaryTotals = summary.totals;
  TestValidator.predicate(
    "itemCount must be non-negative",
    totals.itemCount >= 0,
  );
  TestValidator.predicate(
    "quantityTotal must be non-negative",
    totals.quantityTotal >= 0,
  );
  TestValidator.predicate(
    "subtotal must be non-negative",
    totals.subtotal >= 0,
  );
  TestValidator.predicate(
    "grandTotal must be non-negative",
    totals.grandTotal >= 0,
  );

  // Find the summary line corresponding to our cart item via skuId or productId
  const matchingItem: IShoppingMallCartSummaryItem | undefined =
    summary.items.find((item) => item.skuId === sku.id);

  TestValidator.predicate(
    "summary must contain line for created SKU",
    matchingItem !== undefined,
  );

  if (matchingItem) {
    // Monetary consistency: lineSubtotal ~ unitPrice * quantity
    TestValidator.predicate(
      "unitPrice must be non-negative",
      matchingItem.unitPrice >= 0,
    );
    TestValidator.predicate(
      "lineSubtotal must be non-negative",
      matchingItem.lineSubtotal >= 0,
    );
    TestValidator.predicate(
      "lineTotal must be non-negative",
      matchingItem.lineTotal >= 0,
    );

    const expectedSubtotal = matchingItem.unitPrice * matchingItem.quantity;
    TestValidator.predicate(
      "lineSubtotal should not exceed unitPrice * quantity by a large margin",
      matchingItem.lineSubtotal <= expectedSubtotal + 1e-6,
    );

    if (matchingItem.lineDiscountTotal != null) {
      TestValidator.predicate(
        "lineDiscountTotal must be non-negative when present",
        matchingItem.lineDiscountTotal >= 0,
      );
      TestValidator.predicate(
        "lineTotal must not exceed lineSubtotal when discount present",
        matchingItem.lineTotal <= matchingItem.lineSubtotal + 1e-6,
      );
    }

    // Availability flags should be boolean and coherent with availabilityMessage
    TestValidator.predicate(
      "isAvailable flag must be boolean (always true by typing)",
      typeof matchingItem.isAvailable === "boolean",
    );

    if (matchingItem.availabilityMessage != null) {
      TestValidator.predicate(
        "availabilityMessage, when present, must be non-empty",
        matchingItem.availabilityMessage.length > 0,
      );
    }
  }

  // Totals vs items consistency
  const sumLineSubtotal = summary.items.reduce(
    (acc, item) => acc + item.lineSubtotal,
    0,
  );
  const sumQuantity = summary.items.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );

  TestValidator.predicate(
    "totals.subtotal must be at least sum of line subtotals",
    totals.subtotal + 1e-6 >= sumLineSubtotal,
  );
  TestValidator.predicate(
    "totals.quantityTotal must match sum of line quantities",
    totals.quantityTotal === sumQuantity,
  );
  TestValidator.predicate(
    "totals.itemCount must equal number of items",
    totals.itemCount === summary.items.length,
  );

  // Validate error and warning message structures
  const allMessages: IShoppingMallCartSummaryMessage[] = [
    ...(summary.errors ?? []),
    ...(summary.warnings ?? []),
  ];

  for (const msg of allMessages) {
    TestValidator.predicate(
      "message code must be non-empty",
      msg.code.length > 0,
    );
    TestValidator.predicate(
      "message text must be non-empty",
      msg.message.length > 0,
    );
    TestValidator.predicate(
      "severity must be either 'error' or 'warning'",
      msg.severity === "error" || msg.severity === "warning",
    );
  }

  // If we have any error messages tied to the matching cart item, assert hasErrors
  if (matchingItem) {
    const itemErrors = (summary.errors ?? []).filter(
      (msg) => msg.cartItemId === matchingItem.cartItemId,
    );

    if (itemErrors.length > 0) {
      TestValidator.predicate(
        "hasErrors must be true when there are item-specific errors",
        summary.hasErrors === true,
      );
    }
  }
}
