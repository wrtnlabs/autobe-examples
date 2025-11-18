import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayoutBatch";
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
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate admin payout batch search by status and payout period.
 *
 * Business goal: Ensure that after realistic seller earnings are created and
 * aggregated into payout batches, an admin can search those payout batches by
 * status and payout period using PATCH /shoppingMall/admin/payoutBatches, and
 * receive only the matching batch when filters are applied, and multiple
 * batches when filters are relaxed.
 *
 * High level flow implemented here (pruned to what is feasible with provided
 * APIs):
 *
 * 1. Create three actor accounts and authenticate them using the auth APIs:
 *
 *    - Admin via POST /auth/admin/join
 *    - Seller via POST /auth/seller/join
 *    - Customer via POST /auth/customer/join The SDK automatically installs the
 *         actor access token into the shared connection, so subsequent calls
 *         run under the last authenticated actor.
 * 2. As admin, create base configuration entities required for an order flow:
 *
 *    - Country via POST /shoppingMall/admin/countries
 *    - Region under that country via POST
 *         /shoppingMall/admin/countries/{countryCode}/regions
 *    - Shipping method via POST /shoppingMall/admin/shippingMethods
 *    - Payment method via POST /shoppingMall/admin/paymentMethods
 * 3. As seller, create catalog primitives:
 *
 *    - Product via POST /shoppingMall/seller/products
 * 4. As admin, configure product taxonomy and SKU inventory behavior:
 *
 *    - Category via POST /shoppingMall/admin/categories
 *    - Link product to category via POST
 *         /shoppingMall/admin/products/{productId}/categories
 *    - SKU inventory state via POST /shoppingMall/admin/skuInventoryStates
 * 5. As seller, create a concrete SKU under the product with that inventory state:
 *
 *    - POST /shoppingMall/seller/products/{productId}/skus
 * 6. As customer, build cart and order:
 *
 *    - Create an address referencing created country and region via POST
 *         /shoppingMall/customer/customers/{customerId}/addresses
 *    - Create cart via POST /shoppingMall/customer/carts
 *    - Add cart item referencing the SKU via POST
 *         /shoppingMall/customer/carts/{cartId}/items
 *    - Create order via POST /shoppingMall/customer/orders
 *    - Create logical payment via POST
 *         /shoppingMall/customer/orders/{orderId}/payments
 * 7. As admin, record seller earnings for that order payment:
 *
 *    - POST /shoppingMall/admin/sellers/{sellerId}/earnings
 *
 *    To keep the test feasible and deterministic, the earning is created with
 *    simple but consistent monetary values where net_earning_amount equals
 *    gross minus commission and fees. We assert the earning response type but
 *    do not attempt to re-query it, as no earning index API is provided.
 * 8. As admin, create two payout batches with different statuses and payout
 *    periods that could reasonably cover the earning created above:
 *
 *    - POST /shoppingMall/admin/payoutBatches (twice)
 *
 *         - Batch A: status "draft", payoutPeriodStart = T, end = T+1h
 *         - Batch B: status "completed", payoutPeriodStart = T+2h, end = T+3h All
 *                   monetary totals are arbitrary but consistent, and use the
 *                   same currency code as the earning. They are not
 *                   automatically wired to the earning because there is no
 *                   explicit API for attaching earnings, but that linkage is
 *                   not required for the search behavior under test.
 * 9. Exercise the search endpoint:
 *
 *    - Call PATCH /shoppingMall/admin/payoutBatches with
 *         IShoppingMallSellerPayoutBatch.IRequest using filters:
 *
 *         - Page = 1, limit large enough (e.g., 10)
 *         - Status = "completed"
 *         - Payout_period_start_from = payoutPeriodStart of Batch B
 *         - Payout_period_start_to = same as payoutPeriodStart of Batch B Expectation:
 *                   response pagination.records >= 1 and data[] contains at
 *                   least one batch whose id equals Batch B.id and whose status
 *                   and payout_period_start match the filter. Also assert that
 *                   no batch with id == Batch A.id appears in the filtered
 *                   result.
 *    - Optionally, call the same search endpoint with a relaxed request where status
 *         = null and payout period filters = null, but same pagination.
 *         Expectation: both batches A and B appear somewhere in data[]. Instead
 *         of asserting exact counts, we assert presence by id.
 * 10. Use typia.assert on all non-void responses to guarantee DTO shape, and
 *     TestValidator.equals / predicate to check core business expectations
 *     about filtering.
 */
export async function test_api_admin_payout_batch_search_by_status_and_period(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create country and region
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
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
    sort_order: 1,
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

  // 3. Shipping & payment methods
  const shippingMethodBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Generic card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 4. Create seller and login as seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 5. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Admin creates category and links product
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "General",
    description_en: null,
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 7. Admin creates SKU inventory state
  const inventoryStateBody = {
    code: `IN_STOCK_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Purchasable SKU",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 8. Seller creates a SKU under the product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 10000,
    original_price: 12000,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 9. Customer join & login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 10. Customer creates shipping address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 11. Customer creates a cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 12. Customer adds SKU to cart
  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  // 13. Customer creates order
  const shippingSnapshotBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: "Seoul",
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshotBody,
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

  // 14. Customer creates logical payment for the order
  const payableAmount =
    order.priceSnapshots.length > 0
      ? order.priceSnapshots[0].grand_total_amount
      : order.grand_total_amount;

  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentBody,
      },
    );
  typia.assert(orderPayment);

  // 15. Switch back to admin by logging in (ensures admin token context)
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 16. Admin records seller earning linked to order and payment
  const earningGross = orderPayment.payable_amount;
  const earningCommission = earningGross * 0.1;
  const earningOtherFee = 0;
  const earningNet = earningGross - earningCommission - earningOtherFee;

  const earningBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: earningGross,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: earningCommission,
    other_fee_amount: earningOtherFee,
    net_earning_amount: earningNet,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: new Date().toISOString(),
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;
  const earning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: earningBody,
      },
    );
  typia.assert(earning);

  // 17. Admin creates two payout batches with different statuses and periods
  const now = new Date();
  const periodStartA = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const periodEndA = new Date(now.getTime()).toISOString();
  const periodStartB = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const periodEndB = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const payoutBatchABody = {
    batch_code: `BATCH-A-${RandomGenerator.alphaNumeric(6)}`,
    payout_period_start: periodStartA,
    payout_period_end: periodEndA,
    currency_code: earning.currency_code,
    total_gross_amount: earning.gross_amount,
    total_commission_amount: earning.commission_amount,
    total_net_payout_amount: earning.net_earning_amount,
    status: "draft",
    external_reference: null,
    notes: "Batch A draft",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const payoutBatchA: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchABody,
    });
  typia.assert(payoutBatchA);

  const payoutBatchBBody = {
    batch_code: `BATCH-B-${RandomGenerator.alphaNumeric(6)}`,
    payout_period_start: periodStartB,
    payout_period_end: periodEndB,
    currency_code: earning.currency_code,
    total_gross_amount: earning.gross_amount,
    total_commission_amount: earning.commission_amount,
    total_net_payout_amount: earning.net_earning_amount,
    status: "completed",
    external_reference: null,
    notes: "Batch B completed",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const payoutBatchB: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchBBody,
    });
  typia.assert(payoutBatchB);

  // 18. Search by specific status and payout_period_start window matching only Batch B
  const searchRequestFiltered = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: payoutBatchB.status,
    payout_period_start_from: payoutBatchB.payoutPeriodStart,
    payout_period_start_to: payoutBatchB.payoutPeriodStart,
    payout_period_end_from: null,
    payout_period_end_to: null,
    currency_code: null,
    batch_code: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallSellerPayoutBatch.IRequest;

  const pageFiltered: IPageIShoppingMallSellerPayoutBatch.ISummary =
    await api.functional.shoppingMall.admin.payoutBatches.index(connection, {
      body: searchRequestFiltered,
    });
  typia.assert(pageFiltered);

  // Basic pagination sanity
  TestValidator.predicate(
    "filtered search should return at least one payout batch",
    pageFiltered.pagination.records >= 1,
  );

  const filteredBatchIds = pageFiltered.data.map((b) => b.id);

  TestValidator.predicate(
    "filtered result should contain Batch B",
    filteredBatchIds.includes(payoutBatchB.id),
  );

  TestValidator.predicate(
    "filtered result should not contain Batch A when status filter is completed",
    !filteredBatchIds.includes(payoutBatchA.id),
  );

  // Validate that all returned batches match the status and start window filter
  for (const batch of pageFiltered.data) {
    TestValidator.equals(
      "all filtered batches must have requested status",
      batch.status,
      payoutBatchB.status,
    );
    TestValidator.predicate(
      "all filtered batches must have payout_period_start within window",
      batch.payout_period_start >=
        searchRequestFiltered.payout_period_start_from! &&
        batch.payout_period_start <=
          searchRequestFiltered.payout_period_start_to!,
    );
  }

  // 19. Optional relaxed search: no status / period filters, just pagination
  const searchRequestAll = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    status: null,
    payout_period_start_from: null,
    payout_period_start_to: null,
    payout_period_end_from: null,
    payout_period_end_to: null,
    currency_code: null,
    batch_code: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallSellerPayoutBatch.IRequest;

  const pageAll: IPageIShoppingMallSellerPayoutBatch.ISummary =
    await api.functional.shoppingMall.admin.payoutBatches.index(connection, {
      body: searchRequestAll,
    });
  typia.assert(pageAll);

  const allBatchIds = pageAll.data.map((b) => b.id);

  TestValidator.predicate(
    "unfiltered search should contain Batch A",
    allBatchIds.includes(payoutBatchA.id),
  );
  TestValidator.predicate(
    "unfiltered search should contain Batch B",
    allBatchIds.includes(payoutBatchB.id),
  );
}
