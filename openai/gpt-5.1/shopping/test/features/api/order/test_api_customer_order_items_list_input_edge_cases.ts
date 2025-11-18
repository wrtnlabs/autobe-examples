import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate edge-case pagination and filtering for customer order items listing.
 *
 * This test sets up a realistic multi-line customer order with several SKUs and
 * then calls PATCH /shoppingMall/customer/orders/{orderCode}/items using
 * IShoppingMallOrderItem.IRequest payloads that exercise edge-case input
 * combinations:
 *
 * 1. Very small page size combined with a page index well beyond the last page,
 *    asserting an empty data array while pagination metadata still reflects the
 *    true total records and total pages.
 * 2. Filter combinations that match no items (minQuantity/maxQuantity range that
 *    excludes all quantities, and a skuId filter that does not exist in the
 *    order), asserting an empty data array but correct pagination structure.
 * 3. Requests that omit optional sortBy and sortDirection to verify that the
 *    server applies a stable default ordering (typically line_number ascending)
 *    and that this default ordering is consistent with the underlying order
 *    items.
 *
 * The test also validates that even when filters reference SKUs that may exist
 * elsewhere, the endpoint never leaks items belonging to other orders; all
 * returned IShoppingMallOrderItem.ISummary rows must have a
 * shopping_mall_order_id matching the prepared order.
 */
export async function test_api_customer_order_items_list_input_edge_cases(
  connection: api.IConnection,
) {
  // --- 1. Bootstrap actors: admin, seller, customer ---
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // --- 2. As admin: configure country, region, shipping, payment, category, inventory state ---
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Generic card processor",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "General Goods",
    description_en: "General merchandise category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const inventoryStateCreateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // --- 3. As seller: create product and SKUs ---
  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "GenericBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  const skuCount = 3;
  const skus: IShoppingMallSku[] = [];
  for (let i = 0; i < skuCount; i++) {
    const skuCreateBody = {
      code: `SKU-${RandomGenerator.alphaNumeric(6)}-${i}` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      barcode: null,
      status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
      price: (1000 + i * 500) as number & tags.Minimum<0>,
      original_price: null,
      inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: null,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;

    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id,
          body: skuCreateBody,
        },
      );
    typia.assert(sku);
    skus.push(sku);
  }

  // --- 4. As customer: create shipping address, cart, and order with multiple items ---
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 101",
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const itemsForOrder: IShoppingMallOrderItem.ICreate[] = skus.map(
    (sku, index) => {
      const quantity: number & tags.Type<"int32"> = (index + 1) as number &
        tags.Type<"int32">;
      return {
        shopping_mall_sku_id: sku.id,
        quantity,
      } satisfies IShoppingMallOrderItem.ICreate;
    },
  );

  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: customerAddress.recipient_name,
      phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: customerAddress.postal_code,
      state_or_region: "Seoul",
      city: customerAddress.city,
      address_line1: customerAddress.line1,
      address_line2: customerAddress.line2 ?? null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: itemsForOrder,
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // --- 5. Call PATCH /shoppingMall/customer/orders/{orderCode}/items in various edge scenarios ---

  // Helper: ensure all returned items belong to this order
  const assertItemsBelongToOrder = (
    page: IPageIShoppingMallOrderItem.ISummary,
    expectedOrderId: string & tags.Format<"uuid">,
    title: string,
  ) => {
    for (const item of page.data) {
      TestValidator.equals(
        `${title} - order id must match`,
        item.shopping_mall_order_id,
        expectedOrderId,
      );
    }
  };

  // 5.1 Base listing: small limit, first page, default sort (no sortBy/sortDirection)
  const baseRequestBody = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderItem.IRequest;

  const basePage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderCode: order.order_code,
      body: baseRequestBody,
    });
  typia.assert(basePage);

  await TestValidator.predicate(
    "base page should have at least 1 item when order has items",
    async () => basePage.data.length > 0,
  );
  assertItemsBelongToOrder(basePage, order.id, "base listing default sort");

  // 5.2 Very small page size (limit=1) and out-of-range current page
  const outOfRangeCurrent: number & tags.Type<"int32"> & tags.Minimum<1> =
    (basePage.pagination.pages + 10) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;

  const outOfRangeRequestBody = {
    current: outOfRangeCurrent,
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderItem.IRequest;

  const outOfRangePage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderCode: order.order_code,
      body: outOfRangeRequestBody,
    });
  typia.assert(outOfRangePage);

  TestValidator.equals(
    "out-of-range page should have empty data",
    outOfRangePage.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-range page should keep records count",
    outOfRangePage.pagination.records,
    basePage.pagination.records,
  );
  TestValidator.equals(
    "out-of-range page should keep pages count",
    outOfRangePage.pagination.pages,
    basePage.pagination.pages,
  );

  // 5.3 Filters that match no items by quantity range
  const minQuantityTooHigh: number & tags.Type<"int32"> & tags.Minimum<1> =
    (skus.length + 10) as number & tags.Type<"int32"> & tags.Minimum<1>;

  const quantityFilterBody = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    minQuantity: minQuantityTooHigh,
    maxQuantity: minQuantityTooHigh,
  } satisfies IShoppingMallOrderItem.IRequest;

  const quantityFilteredPage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderCode: order.order_code,
      body: quantityFilterBody,
    });
  typia.assert(quantityFilteredPage);

  TestValidator.equals(
    "quantity filter that excludes all should return empty data",
    quantityFilteredPage.data.length,
    0,
  );

  // 5.4 Filters that match no items by skuId (SKU not in this order)
  const unknownSkuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const skuFilterBody = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    skuId: unknownSkuId,
  } satisfies IShoppingMallOrderItem.IRequest;

  const skuFilteredPage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderCode: order.order_code,
      body: skuFilterBody,
    });
  typia.assert(skuFilteredPage);

  TestValidator.equals(
    "skuId filter referencing non-order SKU should return empty data",
    skuFilteredPage.data.length,
    0,
  );

  // 5.5 Omit sortBy and sortDirection and verify stable default ordering
  const wideRequestBody = {
    current: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderItem.IRequest;

  const widePage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderCode: order.order_code,
      body: wideRequestBody,
    });
  typia.assert(widePage);

  assertItemsBelongToOrder(widePage, order.id, "wide listing");

  const lineNumbers = widePage.data.map((item) => item.line_number);
  const sortedLineNumbers = [...lineNumbers].sort((a, b) => a - b);
  TestValidator.equals(
    "default sort should be ascending line_number",
    lineNumbers,
    sortedLineNumbers,
  );
}
