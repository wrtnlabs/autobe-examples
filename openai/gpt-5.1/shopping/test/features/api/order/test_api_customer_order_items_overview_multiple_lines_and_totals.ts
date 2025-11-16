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
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItemsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemsOverview";
import type { IShoppingMallOrderItemsOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemsOverviewItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that order items overview aggregates multiple distinct SKU lines and
 * exposes consistent monetary totals with the master order snapshot.
 *
 * Business flow:
 *
 * 1. Create a platform admin and authenticate via /auth/platformAdmin/join.
 * 2. As platform admin, create a category tree, a brand, and two products (A and
 *    B) with that brand and a dummy seller id, then create one SKU per product
 *    using known prices.
 * 3. Create a customer via /auth/customer/join (token is set on connection).
 * 4. As customer, create a persistent cart and add two cart items referencing the
 *    two SKUs with different quantities.
 * 5. Compute order-level pricing snapshot from the cart items (subtotal,
 *    discounts=0, shipping=0, tax=0, grand total=subtotal) and create an order
 *    from the cart via /shoppingMall/customer/orders.
 * 6. Immediately call GET /shoppingMall/customer/orders/{orderId}/itemsOverview as
 *    the same customer and validate that:
 *
 *    - There are at least two item lines and itemsCount matches items.length.
 *    - Each lineTotal equals quantity * unitPrice minus any lineDiscountAmount.
 *    - SubtotalAmount equals the sum of all lineTotal values.
 *    - GrandTotalAmount equals subtotal + shippingFeeAmount + taxAmount minus
 *         discountAmount, with undefined amounts treated as 0.
 *    - Currency and monetary snapshot fields match the master order’s corresponding
 *         snapshot values.
 *    - At least two distinct SKUs appear, and per-SKU quantities match the
 *         quantities used when populating the cart.
 *    - All fulfillmentStatus values are identical (initial single status).
 */
export async function test_api_customer_order_items_overview_multiple_lines_and_totals(
  connection: api.IConnection,
) {
  // ---------- 1. Platform admin bootstrap ----------
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.local/join",
    referrer: "https://admin.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // ---------- 2. Catalog bootstrap: category tree, brand, products, SKUs ----------
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: "Main category tree for tests",
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
    name: `Brand-${RandomGenerator.alphabets(5)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "Test brand for items overview",
    logo_uri: "https://cdn.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Dummy seller id, as we do not have seller creation APIs in this context
  const dummySellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productABody = {
    shopping_mall_seller_id: dummySellerId,
    shopping_mall_brand_id: brand.id,
    code: `PROD-A-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1>,
    name: "Product A",
    short_description: "Product A short desc",
    description: "Product A long description",
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.local/product-a.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productBBody = {
    shopping_mall_seller_id: dummySellerId,
    shopping_mall_brand_id: brand.id,
    code: `PROD-B-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1>,
    name: "Product B",
    short_description: "Product B short desc",
    description: "Product B long description",
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.local/product-b.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productABody,
      },
    );
  typia.assert(productA);

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBBody,
      },
    );
  typia.assert(productB);

  const skuAPrice = 1000;
  const skuBPrice = 2000;

  const skuABody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
    name: "SKU A",
    listPrice: skuAPrice,
    salePrice: skuAPrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuBBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
    name: "SKU B",
    listPrice: skuBPrice,
    salePrice: skuBPrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productA.code,
        body: skuABody,
      },
    );
  typia.assert(skuA);

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productB.code,
        body: skuBBody,
      },
    );
  typia.assert(skuB);

  // ---------- 3. Customer creation ----------
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.local/join",
    referrer: "https://shop.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // ---------- 4. Customer cart creation ----------
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-SEOUL",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  // ---------- 5. Add two items (two SKUs) to the cart ----------
  const quantityA = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const quantityB = 3 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItemABody = {
    skuId: skuA.id,
    quantity: quantityA,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemABody,
      },
    );
  typia.assert(cartItemA);

  const cartItemBBody = {
    skuId: skuB.id,
    quantity: quantityB,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItemB: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBBody,
      },
    );
  typia.assert(cartItemB);

  // Use the SKU summary prices from the returned cart items for calculations
  const unitPriceA = cartItemA.unitPrice ?? skuA.salePrice;
  const unitPriceB = cartItemB.unitPrice ?? skuB.salePrice;

  const lineTotalA = (unitPriceA ?? 0) * cartItemA.quantity;
  const lineTotalB = (unitPriceB ?? 0) * cartItemB.quantity;

  const itemsSubtotal = lineTotalA + lineTotalB;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  // ---------- 6. Create order from the cart ----------
  const fakeAddressId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fakeAddressId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: fakeAddressId1,
    billing_address_id: fakeAddressId2,
    customer_note: "Items overview test",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // ---------- 7. Call items overview for the created order ----------
  const overview: IShoppingMallOrderItemsOverview =
    await api.functional.shoppingMall.customer.orders.itemsOverview.at(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(overview);

  // ---------- 8. Structural validations ----------
  TestValidator.equals(
    "overview orderId matches order id",
    overview.orderId,
    order.id,
  );

  TestValidator.predicate(
    "overview has at least two item lines",
    overview.items.length >= 2,
  );

  TestValidator.equals(
    "itemsCount matches items length",
    overview.itemsCount,
    overview.items.length,
  );

  // ---------- 9. Line-level monetary invariants ----------
  overview.items.forEach((item, index) => {
    const effectiveLineDiscount = item.lineDiscountAmount ?? 0;
    const expectedLineTotal =
      item.unitPrice * item.quantity - effectiveLineDiscount;

    TestValidator.equals(
      `lineTotal equals quantity * unitPrice minus discount for line ${index}`,
      item.lineTotal,
      expectedLineTotal,
    );
  });

  // ---------- 10. Header-level monetary invariants ----------
  const sumOfLineTotals = overview.items.reduce(
    (acc, item) => acc + item.lineTotal,
    0,
  );

  TestValidator.equals(
    "subtotalAmount equals sum of line totals",
    overview.subtotalAmount,
    sumOfLineTotals,
  );

  const headerDiscount = overview.discountAmount ?? 0;
  const headerShipping = overview.shippingFeeAmount ?? 0;
  const headerTax = overview.taxAmount ?? 0;

  const expectedGrandTotal =
    overview.subtotalAmount - headerDiscount + headerShipping + headerTax;

  TestValidator.equals(
    "grandTotalAmount equals subtotal - discount + shipping + tax",
    overview.grandTotalAmount,
    expectedGrandTotal,
  );

  // ---------- 11. Cross-check with order snapshot ----------
  TestValidator.equals(
    "overview currency matches order currency_code",
    overview.currency,
    order.currency_code,
  );

  TestValidator.equals(
    "overview subtotalAmount equals order items_subtotal_amount",
    overview.subtotalAmount,
    order.items_subtotal_amount,
  );

  TestValidator.equals(
    "overview discountAmount (or 0) equals order discount_total_amount",
    headerDiscount,
    order.discount_total_amount,
  );

  TestValidator.equals(
    "overview shippingFeeAmount (or 0) equals order shipping_total_amount",
    headerShipping,
    order.shipping_total_amount,
  );

  TestValidator.equals(
    "overview taxAmount (or 0) equals order tax_total_amount",
    headerTax,
    order.tax_total_amount,
  );

  TestValidator.equals(
    "overview grandTotalAmount equals order grand_total_amount",
    overview.grandTotalAmount,
    order.grand_total_amount,
  );

  // ---------- 12. Multi-line SKU distinction and quantity aggregation ----------
  const skuPairs = overview.items.map(
    (item) => `${item.skuId}::${item.skuCode}`,
  );
  const uniqueSkuPairs = Array.from(new Set(skuPairs));

  TestValidator.predicate(
    "overview contains at least two distinct SKU pairs",
    uniqueSkuPairs.length >= 2,
  );

  // Aggregate quantities per skuId from overview items
  const quantityBySkuId = new Map<string, number>();
  overview.items.forEach((item) => {
    const current = quantityBySkuId.get(item.skuId) ?? 0;
    quantityBySkuId.set(item.skuId, current + item.quantity);
  });

  const totalQtyForSkuA = quantityBySkuId.get(skuA.id) ?? 0;
  const totalQtyForSkuB = quantityBySkuId.get(skuB.id) ?? 0;

  TestValidator.equals(
    "aggregated quantity for SKU A matches original cart quantity",
    totalQtyForSkuA,
    cartItemA.quantity,
  );

  TestValidator.equals(
    "aggregated quantity for SKU B matches original cart quantity",
    totalQtyForSkuB,
    cartItemB.quantity,
  );

  // ---------- 13. Fulfillment status sanity ----------
  const distinctFulfillmentStatuses = Array.from(
    new Set(overview.items.map((item) => item.fulfillmentStatus)),
  );

  TestValidator.equals(
    "all lines share the same initial fulfillmentStatus",
    distinctFulfillmentStatuses.length,
    1,
  );
}
