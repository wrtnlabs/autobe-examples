import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
 * Validate basic pagination and filtering for admin shipment items index.
 *
 * Business goal: Ensure that an admin can list shipment items belonging to a
 * specific shipment using PATCH
 * /shoppingMall/admin/shipments/{shipmentCode}/items, and that standard
 * pagination and filtering semantics behave as expected.
 *
 * High level steps:
 *
 * 1. Create and authenticate an admin actor.
 * 2. Create and authenticate a seller actor.
 * 3. Create and authenticate a customer actor.
 * 4. As admin, create required master data: country, region, category,
 *    skuInventoryState, shipping method, and payment method.
 * 5. As seller, create a product and a SKU.
 * 6. As customer, create a cart, add the SKU as a cart item, and then create an
 *    order from that cart (with IShoppingMallOrder.ICreate).
 * 7. As customer, attach a shipping address snapshot to the order.
 * 8. As admin, create a shipment for that order using
 *    api.functional.shoppingMall.admin.shipments.create providing at least one
 *    shipment item referencing the order item and SKU.
 * 9. As admin, create at least one more shipment item for the same shipment using
 *    api.functional.shoppingMall.admin.shipments.items.create so that multiple
 *    shipment items exist under the same shipment.
 * 10. As admin, call PATCH /shoppingMall/admin/shipments/{shipmentCode}/items via
 *     api.functional.shoppingMall.admin.shipments.items.index with an
 *     IShoppingMallShipmentItem.IRequest body specifying pagination with no
 *     filters and validate:
 *
 *     - Response type matches IPageIShoppingMallShipmentItem.ISummary
 *     - Pagination.records equals the total number of shipment items created for that
 *           shipment
 *     - Pagination.current and pagination.limit reflect the requested page and
 *           pageSize
 *     - Every data[i].shipment.shipment_code equals the shipmentCode used in the call
 * 11. As admin, call the same index endpoint again, this time with a filter set on
 *     shopping_mall_order_item_id or shopping_mall_sku_id using the identifiers
 *     from one of the created shipment items, and then validate:
 *
 *     - Response is again IPageIShoppingMallShipmentItem.ISummary
 *     - Pagination.records is less than or equal to the unfiltered total and at least
 *           1
 *     - Every returned item’s orderItem.id or sku.id matches the filtered identifier
 */
export async function test_api_admin_shipment_items_index_basic_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Admin sign-up and login
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Seller sign-up and login
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com` as string &
      tags.Format<"email">,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Customer sign-up and login
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com` as string &
      tags.Format<"email">,
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.test.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 4. Admin master data: country, region, category, skuInventoryState, shipping method, payment method
  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(3),
    name_en: "Test Country",
    phone_code: "+999",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(4),
    name_en: "Test Region",
    region_type: "state",
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

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Test Category",
    description_en: "Category for shipment item tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const skuInventoryStateCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: "In Stock",
    description: "Inventory available",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  const shippingMethodCreateBody = {
    method_code: RandomGenerator.alphaNumeric(6),
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping for tests",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    display_name: "Test Card",
    description: "Payment method for tests",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: country.country_code,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 5. Seller product and SKU
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: "Test Product",
    summary: "Summary",
    description: "Detailed description",
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
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

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer cart and order
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  const orderCreateBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 2 as number & tags.Type<"int32">,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: null,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id as string & tags.Format<"uuid">,
    payment_method_id: paymentMethod.id as string & tags.Format<"uuid">,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Attach shipping address snapshot for order
  const shippingAddressCreateBody = {
    recipient_name: "Test Recipient",
    line1: "123 Test St",
    line2: null,
    city: "Test City",
    postal_code: "12345",
    country_code: country.country_code as string &
      tags.MinLength<2> &
      tags.MaxLength<2>,
    region: null,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallOrderShippingAddress.ICreate;
  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: shippingAddressCreateBody,
      },
    );
  typia.assert(orderShippingAddress);

  // 8. Admin creates shipment with initial shipment item
  const shipmentCreateBody = {
    orderCode: order.order_code,
    shippingAddressId: orderShippingAddress.id as string & tags.Format<"uuid">,
    shippingMethodId: shippingMethod.id as string & tags.Format<"uuid">,
    shippingStatus: "preparing",
    carrierName: null,
    trackingNumber: null,
    expectedShipDate: null,
    shipmentItems: [
      {
        shopping_mall_order_item_id: order.items[0].id,
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ] satisfies IShoppingMallShipmentItem.ICreate[],
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.create(connection, {
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  // 9. Create an additional shipment item under the same shipment
  const secondShipmentItemBody = {
    shopping_mall_order_item_id: shipment.items![0].shopping_mall_order_item_id,
    shopping_mall_sku_id: shipment.items![0].shopping_mall_sku_id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallShipmentItem.ICreate;
  const secondShipmentItem: IShoppingMallShipmentItem =
    await api.functional.shoppingMall.admin.shipments.items.create(connection, {
      shipmentCode: shipment.shipment_code,
      body: secondShipmentItemBody,
    });
  typia.assert(secondShipmentItem);

  const expectedTotalItems = 1 + 1;

  // 10. Admin index call without filters (basic pagination)
  const pageSize: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const listRequestBodyNoFilter = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    orderBy: "created_at",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallShipmentItem.IRequest;
  const listPage: IPageIShoppingMallShipmentItem.ISummary =
    await api.functional.shoppingMall.admin.shipments.items.index(connection, {
      shipmentCode: shipment.shipment_code,
      body: listRequestBodyNoFilter,
    });
  typia.assert(listPage);

  TestValidator.equals(
    "unfiltered total records should equal created shipment items",
    listPage.pagination.records,
    expectedTotalItems,
  );
  TestValidator.equals(
    "current page should be 1",
    listPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page size (limit) should match requested pageSize",
    listPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "all returned items belong to the requested shipmentCode",
    listPage.data.every(
      (item) => item.shipment.shipment_code === shipment.shipment_code,
    ),
  );

  // 11. Admin index call with filter on order item id
  const filterOrderItemId = shipment.items![0].shopping_mall_order_item_id;
  const listRequestBodyFiltered = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    orderBy: "created_at",
    orderDirection: "asc" as const,
    shopping_mall_order_item_id: filterOrderItemId,
  } satisfies IShoppingMallShipmentItem.IRequest;
  const filteredPage: IPageIShoppingMallShipmentItem.ISummary =
    await api.functional.shoppingMall.admin.shipments.items.index(connection, {
      shipmentCode: shipment.shipment_code,
      body: listRequestBodyFiltered,
    });
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered records should be at least 1 and no more than total",
    filteredPage.pagination.records >= 1 &&
      filteredPage.pagination.records <= listPage.pagination.records,
  );
  TestValidator.predicate(
    "all filtered items should reference the filtered order item id",
    filteredPage.data.every((item) => item.orderItem.id === filterOrderItemId),
  );
}
