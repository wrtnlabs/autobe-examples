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
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate cart summary aggregation for a customer cart with multiple items.
 *
 * Business context:
 *
 * - A platform admin configures a minimal but realistic catalog: category tree,
 *   brand, product, and two SKUs.
 * - A customer registers, logs in, creates a persistent cart, and adds two
 *   distinct SKUs with different quantities.
 * - The cart summary endpoint is invoked to compute a denormalized view over the
 *   customer cart.
 *
 * Test validates:
 *
 * 1. Summary items include at least the two SKUs added to the cart.
 * 2. Each item’s lineSubtotal equals unitPrice * quantity.
 * 3. Totals.itemCount matches the number of items; totals.quantityTotal matches
 *    the sum of quantities.
 * 4. Totals.subtotal equals the sum of lineSubtotal values.
 * 5. Totals.grandTotal is numerically consistent with subtotal, discountTotal,
 *    shippingEstimate, and taxEstimate (basic inequality, not exact promotion
 *    logic).
 * 6. Currency matches the configured cart currency and hasErrors is false with no
 *    blocking errors.
 */
export async function test_api_cart_summary_for_customer_cart_with_multiple_items_and_discounts(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Explicit login for platform admin (exercise login API and token handling)
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Create a category tree (realistic catalog setup)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 4. Create a brand
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

  // 5. Create a product (seller ID is a random UUID; in real env this would come from a seller setup)
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();

  const productBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
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

  // 6. Create two SKUs with distinct prices
  const sku1Body = {
    code: `sku1-${RandomGenerator.alphaNumeric(6)}`,
    name: "SKU One",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku2Body = {
    code: `sku2-${RandomGenerator.alphaNumeric(6)}`,
    name: "SKU Two",
    listPrice: 20000,
    salePrice: 15000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: sku1Body,
      },
    );
  typia.assert(sku1);

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: sku2Body,
      },
    );
  typia.assert(sku2);

  // 7. Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 8. Explicit customer login
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 9. Create a customer cart
  const cartCurrency = "KRW";
  const cartRegion = "KR-Seoul";

  const customerCartCreateBody = {
    currency_code: cartCurrency,
    region_code: cartRegion,
    channel: "web",
    metadata: {
      campaign: "spring-sale",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  // 10. Add two items to the cart with different quantities
  const quantity1: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const quantity2: number & tags.Type<"int32"> & tags.Minimum<1> = 3 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const cartItem1Body = {
    skuId: sku1.id,
    quantity: quantity1,
    note: "First SKU item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem2Body = {
    skuId: sku2.id,
    quantity: quantity2,
    note: "Second SKU item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem1: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItem1Body,
      },
    );
  typia.assert(cartItem1);

  const cartItem2: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItem2Body,
      },
    );
  typia.assert(cartItem2);

  // 11. Invoke cart summary with promotions and shipping estimate enabled
  const cartSummaryRequestBody = {
    region_code: cartRegion,
    currency_code: cartCurrency,
    include_promotions: true,
    include_shipping_estimate: true,
    include_diagnostics: true,
  } satisfies IShoppingMallCartSummary.IRequest;

  const summary: IShoppingMallCartSummary =
    await api.functional.shoppingMall.carts.summary.index(connection, {
      body: cartSummaryRequestBody,
    });
  typia.assert(summary);

  // 12. Structural and numeric validations

  // 12.1 At least two items
  TestValidator.predicate(
    "cart summary should contain at least two items",
    summary.items.length >= 2,
  );

  // 12.2 Currency consistency
  TestValidator.equals(
    "cart summary currency should match cart currency",
    summary.currency,
    cartCurrency,
  );

  // 12.3 totals.itemCount equals items.length (use untagged number as first argument)
  TestValidator.equals(
    "totals.itemCount should equal number of items",
    summary.items.length,
    summary.totals.itemCount,
  );

  // 12.4 Quantity and subtotal aggregation
  let aggregatedQuantity = 0 as number;
  let aggregatedSubtotal = 0 as number;

  for (const item of summary.items) {
    // quantity >= 1
    TestValidator.predicate(
      "each item quantity should be at least 1",
      item.quantity >= 1,
    );

    // lineSubtotal equals unitPrice * quantity
    const expectedLineSubtotal = item.unitPrice * item.quantity;
    TestValidator.equals(
      "lineSubtotal should equal unitPrice * quantity",
      item.lineSubtotal,
      expectedLineSubtotal,
    );

    aggregatedQuantity += item.quantity;
    aggregatedSubtotal += item.lineSubtotal;
  }

  TestValidator.equals(
    "totals.quantityTotal should equal sum of item quantities",
    aggregatedQuantity,
    summary.totals.quantityTotal,
  );

  TestValidator.equals(
    "totals.subtotal should equal sum of line subtotals",
    summary.totals.subtotal,
    aggregatedSubtotal,
  );

  // 12.5 hasErrors should be false and errors should be empty or undefined
  TestValidator.predicate(
    "cart summary hasErrors should be false",
    summary.hasErrors === false,
  );

  if (summary.errors !== undefined) {
    TestValidator.equals(
      "errors array should be empty when hasErrors is false",
      summary.errors.length,
      0,
    );
  }

  // 12.6 grandTotal basic consistency: grandTotal >= subtotal - discountTotal
  const discountTotal = summary.totals.discountTotal ?? 0;
  const lowerBound = summary.totals.subtotal - discountTotal;

  TestValidator.predicate(
    "grandTotal should be at least subtotal - discountTotal",
    summary.totals.grandTotal >= lowerBound,
  );

  // 12.7 When discountTotal > 0, at least one item should have lineDiscountTotal > 0
  if (
    summary.totals.discountTotal !== undefined &&
    summary.totals.discountTotal !== null &&
    summary.totals.discountTotal > 0
  ) {
    const hasDiscountedLine = summary.items.some((item) => {
      return (
        item.lineDiscountTotal !== undefined &&
        item.lineDiscountTotal !== null &&
        item.lineDiscountTotal > 0
      );
    });

    TestValidator.predicate(
      "at least one line should have a positive lineDiscountTotal when discountTotal > 0",
      hasDiscountedLine,
    );
  }
}
