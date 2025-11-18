import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentRefundItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentRefundItem";
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
import type { IShoppingMallPaymentRefundItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefundItem";
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
 * Validate partial quantity refund items and cumulative quantity constraints.
 *
 * Business goal:
 *
 * - Ensure that admin can create multiple refund item records for the same order
 *   item, each refunding part of the original quantity.
 * - Verify that two valid partial refund items (quantity 1 each) are accepted
 *   when the original order quantity is at least 3.
 * - Verify that the listing endpoint for refund items returns at least the two
 *   created items and that their quantities and amounts match expectations.
 *
 * Scenario (adapted to available APIs):
 *
 * 1. Admin joins (self-registration) and becomes the authenticated admin.
 * 2. Seller joins and logs in as seller.
 * 3. Admin creates country and region master data.
 * 4. Admin creates a product category.
 * 5. Seller creates a product.
 * 6. Admin links product to category.
 * 7. Admin creates a SKU inventory state that is purchasable.
 * 8. Seller creates a SKU under the product with inventory_quantity >= 5.
 * 9. Customer joins and logs in as customer.
 * 10. Admin creates a shipping method and payment method.
 * 11. Customer creates a cart.
 * 12. Customer creates a shipping address.
 * 13. Customer creates an order using the SKU with quantity 3.
 * 14. Customer creates an order payment for (roughly) order grand_total_amount.
 * 15. Admin creates a refund header for that order payment with requested_amount
 *     and approved_amount covering at least two units.
 * 16. Admin creates first refund item for that order item with refunded_quantity =
 *     1 and line_refund_amount equal to the unit price.
 * 17. Admin creates second refund item for the same order item with
 *     refunded_quantity = 1 and the same unit price.
 * 18. Admin lists refund items via PATCH
 *     /shoppingMall/admin/payments/{orderPaymentId}/refunds/{refundSequence}/items
 *     filtered by orderItemId, and asserts that:
 *
 *     - At least two records are returned.
 *     - Sum of refunded_quantity across returned items for that order item is 2.
 *     - Each item has the expected unit_price_amount and line_refund_amount.
 *
 * Note: The scenario plan mentions an optional third refund pushing the
 * quantity above the original quantity and expecting a 4xx error. The available
 * mocking and APIs do not guarantee error semantics, and type-error testing is
 * forbidden, so this test focuses only on successful partial refunds and
 * correct indexing.
 */
export async function test_api_admin_refund_item_creation_partial_quantity_refund(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Seller joins and logs in
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 3. Admin creates country and region
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const countryCode = "US";
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4. Admin creates a product category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 5. Seller creates a product
  const productCreateBody = {
    code: `prd-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Product",
    summary: "A product used for refund testing",
    description: RandomGenerator.paragraph({ sentences: 10 }),
    brand: "TestBrand",
    model_name: "Model-1",
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

  // 6. Admin links product to category
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

  // 7. Admin creates a purchasable SKU inventory state
  const skuInventoryStateCreateBody = {
    code: `state-${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Standard in-stock state",
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

  // 8. Seller creates a SKU under the product
  const unitPrice = 100 as number;
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: unitPrice,
    original_price: unitPrice,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // 9. Customer joins and logs in
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 10. Admin creates shipping and payment methods
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const shippingMethodCreateBody = {
    method_code: `ship-${RandomGenerator.alphaNumeric(5)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: `pm-${RandomGenerator.alphaNumeric(5)}`,
    display_name: "Card",
    description: "Card payment",
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

  // Switch back to customer
  const customerRelogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerRelogin);

  // 11. Customer creates a cart
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

  // Note: There is no direct cart item API available in this context, so the
  // order will be created directly with order items.

  // 12. Customer creates a shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Test Street",
    line2: null,
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  // 13. Customer creates an order with quantity 3 for the SKU
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 3 as number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: address.id,
    shipping_address_snapshot: null,
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

  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );
  const orderItem: IShoppingMallOrderItem = order.items[0];

  // 14. Customer creates a payment for the order grand_total_amount
  const paymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 15. Admin creates a refund header for at least two units
  const adminLoginForRefund: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForRefund);

  const twoUnitsAmount = unitPrice * 2;
  const refundCreateBody = {
    currency_code: orderPayment.currency_code,
    requested_amount: twoUnitsAmount,
    approved_amount: twoUnitsAmount,
    refunded_amount: 0,
    status: "pending",
    reason_code: "test_partial_quantity",
    reason_message: "Partial quantity refund test",
    provider_reference: undefined,
    metadata: undefined,
  } satisfies IShoppingMallPaymentRefund.ICreate;
  const refund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: refundCreateBody,
      },
    );
  typia.assert(refund);

  const refundSequence: number & tags.Type<"int32"> = refund.refund_sequence;

  // 16. Admin creates first refund item for quantity 1
  const firstRefundItemCreateBody = {
    shopping_mall_order_item_id: orderItem.id,
    refunded_quantity: 1,
    unit_price_amount: unitPrice,
    line_refund_amount: unitPrice,
    reason_code: "partial_refund_1",
  } satisfies IShoppingMallPaymentRefundItem.ICreate;
  const firstRefundItem: IShoppingMallPaymentRefundItem =
    await api.functional.shoppingMall.admin.payments.refunds.items.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        refundSequence: String(refundSequence),
        body: firstRefundItemCreateBody,
      },
    );
  typia.assert(firstRefundItem);

  // 17. Admin creates second refund item for quantity 1
  const secondRefundItemCreateBody = {
    shopping_mall_order_item_id: orderItem.id,
    refunded_quantity: 1,
    unit_price_amount: unitPrice,
    line_refund_amount: unitPrice,
    reason_code: "partial_refund_2",
  } satisfies IShoppingMallPaymentRefundItem.ICreate;
  const secondRefundItem: IShoppingMallPaymentRefundItem =
    await api.functional.shoppingMall.admin.payments.refunds.items.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        refundSequence: String(refundSequence),
        body: secondRefundItemCreateBody,
      },
    );
  typia.assert(secondRefundItem);

  // 18. Admin lists refund items filtered by orderItemId
  const listBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderItemId: orderItem.id,
    minLineRefundAmount: undefined,
    maxLineRefundAmount: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: "created_at",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallPaymentRefundItem.IRequest;

  const pageResult: IPageIShoppingMallPaymentRefundItem.ISummary =
    await api.functional.shoppingMall.admin.payments.refunds.items.index(
      connection,
      {
        orderPaymentId: orderPayment.id,
        refundSequence,
        body: listBody,
      },
    );
  typia.assert(pageResult);

  TestValidator.predicate(
    "refund items list contains at least two items",
    pageResult.data.length >= 2,
  );

  // Filter strictly by the target order item id from the summary data
  const filteredItems: IShoppingMallPaymentRefundItem.ISummary[] =
    pageResult.data.filter(
      (item) => item.shopping_mall_order_item_id === orderItem.id,
    );

  TestValidator.predicate(
    "filtered refund items contain at least two entries for the order item",
    filteredItems.length >= 2,
  );

  const totalRefundedQuantity = filteredItems.reduce(
    (sum, item) => sum + item.refunded_quantity,
    0,
  );

  TestValidator.equals(
    "total refunded quantity across items equals 2",
    totalRefundedQuantity,
    2,
  );

  filteredItems.forEach((item, index) => {
    TestValidator.equals(
      `refund item ${index} unit price matches expected`,
      item.unit_price_amount,
      unitPrice,
    );
    TestValidator.equals(
      `refund item ${index} line refund amount matches expected`,
      item.line_refund_amount,
      unitPrice * item.refunded_quantity,
    );
  });
}
