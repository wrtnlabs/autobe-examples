import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAnalyticsGranularity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsGranularity";
import type { IShoppingMallAnalyticsPaymentByMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentByMethod";
import type { IShoppingMallAnalyticsPaymentBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentBySeller";
import type { IShoppingMallAnalyticsPaymentByStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentByStatus";
import type { IShoppingMallAnalyticsPaymentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentSummary";
import type { IShoppingMallAnalyticsPaymentTimeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentTimeBucket";
import type { IShoppingMallAnalyticsPaymentTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentTotals";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
 * Validate admin payment summary over a basic daily time window.
 *
 * Business flow:
 *
 * - Admin joins and becomes authenticated.
 * - Admin creates an active payment method configuration.
 * - Seller joins and authenticates, then registers a product and SKU.
 * - Customer joins and authenticates, creates a cart, and places an order using
 *   the SKU.
 * - Customer creates a logical payment for the order using the configured payment
 *   method.
 * - Admin calls the analytics payment summary endpoint with a [from,to) window
 *   that covers the payment creation time and granularity "day".
 *
 * Validation points:
 *
 * - The analytics result timeRange covers the requested [from,to) window.
 * - Granularity in the response equals the requested granularity.
 * - Totals.totalPayments >= 1 and totals.successfulPayments >= 0.
 * - Totals.totalProcessedAmount is non‑negative.
 * - Optionally validate that method/seller/time-series breakdowns are consistent
 *   and non-negative when present.
 */
export async function test_api_admin_payment_summary_basic_window(
  connection: api.IConnection,
) {
  // 1. Admin joins (register + implicit authentication)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Admin explicitly logs in
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Admin creates a purchasable SKU inventory state and payment method.
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "State for in-stock items used by tests",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  const paymentMethodCode = `card_${RandomGenerator.alphaNumeric(6)}`;
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: "Test payment method for analytics",
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

  // 4. Seller joins and logs in.
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Seller creates a product and SKU.
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.test.local/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const unitPrice = 1000;
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: unitPrice,
    original_price: unitPrice,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. Customer joins and logs in.
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "Customer1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://shop.test.local" as string & tags.Format<"uri">,
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
    href: "https://shop.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://shop.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 7. Customer creates a cart (actor_type customer).
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

  // 8. Customer creates a shipping address under their customerId.
  const addressBody = {
    shopping_mall_country_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 9. Customer creates an order using the SKU, address snapshot and payment method.
  const shippingSnapshotBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: "KR",
    postal_code: address.postal_code,
    state_or_region: "Seoul",
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemBody],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshotBody,
    shipping_method_id: null,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 10. Customer creates a logical payment for the order.
  const payableAmount = unitPrice;
  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: cart.currency_code,
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

  // 11. Admin requests analytics payment summary for a window covering now.
  const now = new Date();
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const toDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes later

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const requestBody = {
    from: fromIso,
    to: toIso,
    granularity: "day" as IShoppingMallAnalyticsGranularity,
    paymentMethodCodes: [paymentMethod.code],
    sellerIds: [],
  } satisfies IShoppingMallAnalyticsPaymentSummary.IRequest;

  const summary: IShoppingMallAnalyticsPaymentSummary =
    await api.functional.shoppingMall.admin.analytics.payments.summary.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(summary);

  // 12. Validate timeRange and granularity.
  const timeRange: IShoppingMallAnalyticsTimeRange = summary.timeRange;
  typia.assert(timeRange);

  TestValidator.predicate(
    "timeRange.from should be <= requested from or slightly normalized",
    new Date(timeRange.from).getTime() <= new Date(fromIso).getTime(),
  );
  TestValidator.predicate(
    "timeRange.to should be >= requested to or slightly normalized",
    new Date(timeRange.to).getTime() >= new Date(toIso).getTime(),
  );

  const granularity: IShoppingMallAnalyticsGranularity = summary.granularity;
  TestValidator.equals(
    "granularity must equal requested value",
    granularity,
    requestBody.granularity,
  );

  // 13. Validate totals.
  const totals: IShoppingMallAnalyticsPaymentTotals = summary.totals;
  typia.assert(totals);

  TestValidator.predicate(
    "totals.totalPayments should be at least 1",
    totals.totalPayments >= 1,
  );

  TestValidator.predicate(
    "totals.successfulPayments should be non-negative",
    totals.successfulPayments >= 0,
  );

  TestValidator.predicate(
    "totals.totalProcessedAmount should be non-negative",
    totals.totalProcessedAmount >= 0,
  );

  // 14. Optionally validate byMethod to see the configured payment method is present when provided.
  const byMethod: IShoppingMallAnalyticsPaymentByMethod[] | undefined =
    summary.byMethod;
  if (byMethod && byMethod.length > 0) {
    const methodEntry = byMethod.find(
      (bucket) => bucket.paymentMethodCode === paymentMethod.code,
    );
    if (methodEntry) {
      TestValidator.predicate(
        "byMethod entry for payment method should have non-negative totals",
        methodEntry.totalPayments >= 0 &&
          methodEntry.successfulPayments >= 0 &&
          (methodEntry.totalProcessedAmount ?? 0) >= 0,
      );
    }
  }

  // 15. Optionally validate bySeller when present.
  const bySeller: IShoppingMallAnalyticsPaymentBySeller[] | undefined =
    summary.bySeller;
  if (bySeller && bySeller.length > 0) {
    TestValidator.predicate(
      "each bySeller bucket should have non-negative totals",
      bySeller.every(
        (bucket) =>
          bucket.totalPayments >= 0 &&
          bucket.successfulPayments >= 0 &&
          bucket.failedPayments >= 0 &&
          bucket.totalProcessedAmount >= 0,
      ),
    );
  }

  // 16. Optionally validate timeSeries buckets, if present.
  const timeSeries: IShoppingMallAnalyticsPaymentTimeBucket[] | undefined =
    summary.timeSeries;
  if (timeSeries && timeSeries.length > 0) {
    const rangeStart = new Date(timeRange.from).getTime();
    const rangeEnd = new Date(timeRange.to).getTime();

    for (const bucket of timeSeries) {
      const bucketStart = new Date(bucket.bucketStart).getTime();
      const bucketEnd = new Date(bucket.bucketEnd).getTime();

      TestValidator.predicate(
        "bucketStart must be within or equal to timeRange",
        bucketStart >= rangeStart && bucketStart <= rangeEnd,
      );
      TestValidator.predicate(
        "bucketEnd must be within or equal to timeRange",
        bucketEnd >= rangeStart && bucketEnd <= rangeEnd,
      );

      typia.assert(bucket.totals);
      TestValidator.predicate(
        "bucket totals should have non-negative counts and amounts",
        bucket.totals.totalPayments >= 0 &&
          bucket.totals.successfulPayments >= 0 &&
          bucket.totals.failedPayments >= 0 &&
          bucket.totals.totalProcessedAmount >= 0,
      );
    }
  }
}
