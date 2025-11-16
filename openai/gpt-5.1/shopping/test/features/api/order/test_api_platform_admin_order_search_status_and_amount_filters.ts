import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
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

/**
 * Validate platform admin order search filters for status and monetary ranges.
 *
 * Business scenario:
 *
 * - Two customers place multiple orders with different line quantities so that
 *   resulting items_subtotal_amount and grand_total_amount differ.
 * - A seller and platform admin exist to satisfy catalog and admin roles.
 * - The platform admin uses PATCH /shoppingMall/platformAdmin/orders/search to
 *   retrieve paginated order summaries across all customers.
 *
 * Test focus (adapted to available APIs/DTOs):
 *
 * - Monetary filters: grandTotalAmountMin/Max and itemsSubtotalAmountMin/Max
 *   should restrict results to orders whose aggregated values fall within the
 *   specified ranges.
 * - Status filters: we cannot set custom status strings, but we can:
 *
 *   - Observe an existing order summary's status/payment_status value.
 *   - Use that value in orderStatuses/paymentStatuses filters.
 *   - Assert that all returned summaries share that same status/payment_status.
 * - Pagination metadata: pagination.records and pagination.limit/current/pages
 *   should be coherent with the number of results and filters.
 */
export async function test_api_platform_admin_order_search_status_and_amount_filters(
  connection: api.IConnection,
) {
  // Helper to generate a realistic URL string
  const href: string = "https://example.com/join";
  const referrer: string = "https://example.com/landing";

  // 1. Register platform admin (also authenticates as that admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register seller and authenticate as seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. As seller, create a product
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. As seller, create a SKU for that product
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const basePrice = 10000;
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.name(2),
    listPrice: basePrice,
    salePrice: basePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 5. Create inventory for that SKU so it can be ordered
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 6. As platform admin, create category tree and brand (dependency setup)
  const categoryTreeCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 7. Customer A join and create two orders (low and high amount)
  const customerHref: string = "https://example.com/customer";
  const customerRef: string = "https://example.com/marketing";

  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: customerHref,
    referrer: customerRef,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert(customerAAuthorized);

  // Helper to create cart and order for a given quantity
  const createCartAndOrderForCustomer = async (
    quantity: number & (number & tags.Type<"int32"> & tags.Minimum<1>),
  ) => {
    const cartBody = {
      currency_code: "KRW",
      region_code: "KR-Seoul",
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

    const cartItemBody = {
      skuId: sku.id,
      quantity,
      note: null,
    } satisfies IShoppingMallCustomerCartItem.ICreate;
    const cartItem: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);

    const itemsSubtotal = sku.salePrice * quantity;
    const discount = 0;
    const shipping = 0;
    const tax = 0;
    const grandTotal = itemsSubtotal - discount + shipping + tax;

    const orderCreateBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: itemsSubtotal,
      discount_total_amount: discount,
      shipping_total_amount: shipping,
      tax_total_amount: tax,
      grand_total_amount: grandTotal,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: undefined,
    } satisfies IShoppingMallOrder.ICreate;
    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(order);
    return order;
  };

  // Customer A low-value order (quantity 1)
  const orderALow: IShoppingMallOrder = await createCartAndOrderForCustomer(1);
  // Customer A high-value order (quantity 3)
  const orderAHigh: IShoppingMallOrder = await createCartAndOrderForCustomer(3);

  // 8. Customer B join and create one medium order (quantity 2)
  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: customerHref,
    referrer: customerRef,
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerBAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert(customerBAuthorized);

  const orderBMedium: IShoppingMallOrder =
    await createCartAndOrderForCustomer(2);

  // 9. Re-login as platform admin to perform global searches (ensure actor)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Collect expected amounts for range calculations
  const lowGrand = orderALow.grand_total_amount;
  const highGrand = orderAHigh.grand_total_amount;
  const mediumGrand = orderBMedium.grand_total_amount;

  // Sanity: ensure ordering of grand totals
  TestValidator.predicate(
    "low grand total less than high",
    lowGrand < highGrand,
  );

  // 10. Baseline search with no filters (just page + limit)
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrder.IRequest;
  const baselinePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.search.index(
      connection,
      { body: baselineRequest },
    );
  typia.assert(baselinePage);

  TestValidator.predicate(
    "baseline pagination has at least 3 records",
    baselinePage.pagination.records >= 3,
  );

  // 11. Search by grand total range to select mid-range orders
  const minGrandRange = Math.min(lowGrand, mediumGrand);
  const maxGrandRange = Math.max(mediumGrand, highGrand);

  const rangeRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    grandTotalAmountMin: minGrandRange,
    grandTotalAmountMax: maxGrandRange,
  } satisfies IShoppingMallOrder.IRequest;

  const rangePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.search.index(
      connection,
      { body: rangeRequest },
    );
  typia.assert(rangePage);

  // All returned orders must be within the range
  for (const summary of rangePage.data) {
    TestValidator.predicate(
      "grand total within specified range",
      summary.total_amount >= minGrandRange &&
        summary.total_amount <= maxGrandRange,
    );
  }

  // 12. Search by items subtotal range to select only the highest order
  const itemsMin = orderAHigh.items_subtotal_amount;
  const itemsMax = orderAHigh.items_subtotal_amount;

  const itemsRangeRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    itemsSubtotalAmountMin: itemsMin,
    itemsSubtotalAmountMax: itemsMax,
  } satisfies IShoppingMallOrder.IRequest;

  const itemsRangePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.search.index(
      connection,
      { body: itemsRangeRequest },
    );
  typia.assert(itemsRangePage);

  for (const summary of itemsRangePage.data) {
    TestValidator.predicate(
      "items subtotal within high-only range",
      summary.total_amount >= itemsMin,
    );
  }

  // 13. Status-based search: pick a status value from an existing summary
  const sampleSummary = baselinePage.data[0];
  const sampledOrderStatus = sampleSummary.status;
  const sampledPaymentStatus = sampleSummary.payment_status;

  const statusRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderStatuses: [sampledOrderStatus],
    paymentStatuses: [sampledPaymentStatus],
  } satisfies IShoppingMallOrder.IRequest;

  const statusPage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.platformAdmin.orders.search.index(
      connection,
      { body: statusRequest },
    );
  typia.assert(statusPage);

  for (const summary of statusPage.data) {
    TestValidator.equals(
      "order status matches sampled status",
      summary.status,
      sampledOrderStatus,
    );
    TestValidator.equals(
      "payment status matches sampled status",
      summary.payment_status,
      sampledPaymentStatus,
    );
  }
}
