import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";
import type { IShoppingMallRefundsByStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsByStatusStatistics";
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
 * Smoke-test aggregated refund-by-status statistics under moderate load.
 *
 * Business goal
 *
 * - Verify that the admin analytics endpoint `GET
 *   /shoppingMall/admin/refundsAndDisputes/statistics/refundsByStatus`
 *   successfully aggregates refund data after seeding a moderately large number
 *   of refund requests, and that the returned totals and buckets are consistent
 *   with the fact that refunds exist.
 *
 * High-level flow
 *
 * 1. Bootstrap actors
 *
 *    - Admin join + login
 *    - Seller join + login
 *    - Customer join + login
 * 2. Admin configuration seeding
 *
 *    - Create a country and region to support shipping addresses
 *    - Create a purchasable SKU inventory state
 *    - Create a catalog category
 *    - Create a shipping method
 *    - Create a payment method
 *    - Create a refund request reason usable for refunds
 * 3. Catalog seeding
 *
 *    - As seller, create a product
 *    - As admin, link the product to the category
 *    - As seller, create a single SKU under the product using the purchasable
 *         inventory state
 * 4. Customer setup
 *
 *    - As customer, create a reusable shipping address under their customerId using
 *         the previously created country/region
 * 5. Order + payment + refund seeding loop
 *
 *    - For N iterations (e.g., 30–60 to keep runtime reasonable):
 *
 *         - As customer, create a fresh cart
 *         - Create an order that purchases the pre-created SKU directly using
 *                   IShoppingMallOrder.ICreate
 *         - Create a logical payment for the order via IShoppingMallOrderPayment.ICreate
 *         - For a subset of iterations (e.g., every second order), as admin, create a
 *                   refund request via IShoppingMallRefundRequest.ICreate
 *                   linked to the order and payment, reusing the configured
 *                   refund reason
 * 6. Statistics validation
 *
 *    - As admin, call refundsAndDisputes.statistics.refundsByStatus.index
 *    - Validate:
 *
 *         - Typia.assert on IShoppingMallRefundsByStatusStatistics
 *         - TotalRefundCount >= number of created refund requests
 *         - TotalRefundAmount > 0 when at least one refund exists
 *         - Currency is a non-empty string
 *         - At least one bucket has refundCount > 0
 *         - Sum of bucket.refundCount is >= totalRefundCount
 *
 * Notes and constraints
 *
 * - We do not assert specific refund status strings; we only assert monotonic
 *   properties over counts and amounts.
 * - We do not measure wall-clock time; performance is treated as a smoke check
 *   via successful aggregation under moderate data volume.
 */
export async function test_api_admin_refunds_by_status_large_volume_performance_smoke(
  connection: api.IConnection,
) {
  // 1. Bootstrap admin, seller, customer
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 2. Admin configuration: country, region, inventory state, category, shipping/payment, refund reason
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

  const inventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Standard purchasable inventory",
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

  const categoryCreateBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card payment",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  const refundReasonCreateBody = {
    code: "damaged_item",
    name: "Damaged item",
    description: "Item arrived damaged",
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const refundReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: refundReasonCreateBody,
      },
    );
  typia.assert(refundReason);

  // 3. Catalog: seller product + SKU
  const productCreateBody = {
    code: "SKU-PROD-" + RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(4),
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "ko-KR",
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
    code: "SKU-" + RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 10_000,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. Customer shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test Street",
    line2: "Suite 101",
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile("010"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 5. Seed orders, payments, and refund requests
  const iterations = 30;

  const createdRefundRequests: IShoppingMallRefundRequest[] = [];

  for (let i = 0; i < iterations; i++) {
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

    const orderItemCreate: IShoppingMallOrderItem.ICreate = {
      shopping_mall_sku_id: sku.id,
      quantity: 1,
    };

    const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
      {
        recipient_name: customerAddress.recipient_name,
        phone_number: customerAddress.phone_number ?? "01000000000",
        country_code: country.country_code,
        postal_code: customerAddress.postal_code,
        state_or_region: region.code,
        city: customerAddress.city,
        address_line1: customerAddress.line1,
        address_line2: customerAddress.line2 ?? null,
      };

    const orderCreateBody = {
      cart_id: cart.id,
      currency_code: "KRW",
      items: [orderItemCreate],
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

    const payableAmountBase = 10_000 + i * 100;
    const paymentCreateBody = {
      payment_method_id: paymentMethod.id,
      currency_code: "KRW",
      payable_amount: payableAmountBase,
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

    // For every second order, create a refund request as admin
    if (i % 2 === 0) {
      const requestedAmount = Math.max(
        1_000,
        Math.floor(payableAmountBase / 2),
      );

      const refundRequestCreateBody = {
        shopping_mall_order_id: order.id,
        shopping_mall_order_payment_id: orderPayment.id,
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: null,
        shopping_mall_admin_id: admin.id,
        shopping_mall_refund_request_reason_id: refundReason.id,
        shopping_mall_cancellation_request_id: null,
        shopping_mall_case_sla_config_id: null,
        requested_total_amount: requestedAmount,
        currency_code: "KRW",
        reason_description: "Automated test refund request",
        requested_by_actor_type: "customer",
        requires_return: false,
      } satisfies IShoppingMallRefundRequest.ICreate;

      const refundRequest: IShoppingMallRefundRequest =
        await api.functional.shoppingMall.admin.refundRequests.create(
          connection,
          {
            body: refundRequestCreateBody,
          },
        );
      typia.assert(refundRequest);

      createdRefundRequests.push(refundRequest);
    }
  }

  const expectedMinRefundCount = createdRefundRequests.length;

  // 6. Fetch and validate refunds-by-status statistics as admin
  const stats: IShoppingMallRefundsByStatusStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.refundsByStatus.index(
      connection,
    );
  typia.assert(stats);

  TestValidator.predicate(
    "refunds by status statistics should have at least one status bucket",
    stats.statuses.length > 0,
  );

  TestValidator.predicate(
    "totalRefundCount should be >= number of created refund requests",
    stats.totalRefundCount >= expectedMinRefundCount,
  );

  if (expectedMinRefundCount > 0) {
    TestValidator.predicate(
      "totalRefundAmount should be positive when refunds exist",
      stats.totalRefundAmount > 0,
    );
  }

  TestValidator.predicate(
    "currency string should be non-empty",
    stats.currency.length > 0,
  );

  const sumBucketCount = stats.statuses.reduce(
    (acc, bucket) => acc + bucket.refundCount,
    0,
  );

  TestValidator.predicate(
    "sum of bucket refundCount should be >= totalRefundCount",
    sumBucketCount >= stats.totalRefundCount,
  );

  const hasNonZeroBucket = stats.statuses.some(
    (bucket) => bucket.refundCount > 0,
  );

  TestValidator.predicate(
    "at least one bucket should have refundCount > 0",
    hasNonZeroBucket,
  );
}
