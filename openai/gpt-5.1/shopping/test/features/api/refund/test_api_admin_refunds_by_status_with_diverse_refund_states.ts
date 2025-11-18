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
 * Verify that admin refunds-by-status statistics correctly aggregate counts and
 * amounts from multiple refund requests created on different orders and
 * payments.
 *
 * Business flow:
 *
 * 1. Admin registers (join) and becomes authenticated.
 * 2. Admin configures minimal master data: country, region, SKU inventory state,
 *    category, shipping method, and payment method.
 * 3. Seller registers and becomes authenticated; creates a product and a
 *    purchasable SKU.
 * 4. Customer registers and becomes authenticated; creates a shipping address and
 *    a cart.
 * 5. Customer creates two orders with different quantities for the SKU so that
 *    order and payment totals differ.
 * 6. Customer creates one payment per order.
 * 7. Admin configures a refund request reason.
 * 8. Admin creates multiple refund requests targeting different orders/ payments
 *    and with different requested_total_amount values.
 * 9. Admin calls refunds-by-status statistics API.
 * 10. Test validates that:
 *
 *     - Response matches IShoppingMallRefundsByStatusStatistics.
 *     - For each status observed on created refund requests, the statistics contain a
 *           bucket whose refundCount equals the number of requests with that
 *           status and whose totalRefundAmount equals the sum of their
 *           requested_total_amount values.
 *     - TotalRefundCount and totalRefundAmount equal the sums of the buckets.
 *     - Currency in statistics matches the order currency.
 */
export async function test_api_admin_refunds_by_status_with_diverse_refund_states(
  connection: api.IConnection,
) {
  // 1. Admin join (authorization header will be set by SDK)
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}@admin.test` as string &
          tags.Format<"email">,
        password: adminPassword as string & tags.Format<"password">,
        ip: null,
        href: "https://admin.test/join" as string & tags.Format<"uri">,
        referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(admin);

  // 2. Master data: country, region, SKU inventory state, category,
  //    shipping method, payment method
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: "US",
        name_en: "United States",
        phone_code: "+1",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert(country);

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: "CA",
          name_en: "California",
          region_type: "state",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: `purchasable-${RandomGenerator.alphabets(4)}`,
          name: "Purchasable",
          description: "SKU can be purchased",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inventoryState);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: `electronics-${RandomGenerator.alphabets(4)}`,
        name_en: "Electronics",
        description_en: "Electronics category for tests",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: `standard-${RandomGenerator.alphabets(4)}`,
        display_name: "Standard Shipping",
        service_level_description: "Standard ground shipping",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: `card-${RandomGenerator.alphabets(4)}`,
        display_name: "Credit Card",
        description: "Card payment",
        provider_type: "card_processor",
        allowed_currencies: "USD",
        allowed_countries: "US",
        min_amount: 0,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 3. Seller join (already authenticated after join)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}@seller.test` as string &
          tags.Format<"email">,
        password: sellerPassword as string & tags.Format<"password">,
        ip: null,
        href: "https://seller.test/join" as string & tags.Format<"uri">,
        referrer: "https://seller.test/landing" as string & tags.Format<"uri">,
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(seller);

  // 4. Seller product and SKU
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "TestBrand",
        model_name: "ModelX",
        status: "active",
        primary_image_uri: "https://img.test/product.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        code: RandomGenerator.alphaNumeric(8) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: 120,
        inventory_quantity: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // 5. Customer join (authenticated after join)
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}@customer.test` as string &
          tags.Format<"email">,
        password: customerPassword as string & tags.Format<"password">,
        ip: null,
        href: "https://shop.test/join" as string & tags.Format<"uri">,
        referrer: "https://shop.test/landing" as string & tags.Format<"uri">,
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(customer);

  // 6. Customer shipping address
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: "John Customer",
          line1: "123 Main St",
          line2: null,
          city: "Los Angeles",
          postal_code: "90001",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 7. Cart for customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // 8. Two orders with different quantities so totals differ
  const createOrder = async (quantity: number): Promise<IShoppingMallOrder> => {
    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: {
          cart_id: null,
          currency_code: "USD",
          items: [
            {
              shopping_mall_sku_id: sku.id,
              quantity: quantity as number & tags.Type<"int32">,
            } satisfies IShoppingMallOrderItem.ICreate,
          ],
          shipping_address_id: address.id,
          shipping_address_snapshot: null,
          shipping_method_id: shippingMethod.id,
          payment_method_id: paymentMethod.id,
          buyer_memo: null,
          platform_note: null,
        } satisfies IShoppingMallOrder.ICreate,
      });
    typia.assert(order);
    return order;
  };

  const orderSmall = await createOrder(1);
  const orderLarge = await createOrder(3);

  // 9. Payments for each order
  const createPayment = async (
    order: IShoppingMallOrder,
    amount: number,
  ): Promise<IShoppingMallOrderPayment> => {
    const payment: IShoppingMallOrderPayment =
      await api.functional.shoppingMall.customer.orders.payments.create(
        connection,
        {
          orderId: order.id,
          body: {
            payment_method_id: paymentMethod.id,
            currency_code: order.currency_code,
            payable_amount: amount,
            provider_reference: null,
            provider_status_code: null,
            metadata: null,
          } satisfies IShoppingMallOrderPayment.ICreate,
        },
      );
    typia.assert(payment);
    return payment;
  };

  const paymentSmall = await createPayment(orderSmall, 100);
  const paymentLarge = await createPayment(orderLarge, 300);

  // 10. Refund reason configuration
  const reason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: {
          code: `damaged_item_${RandomGenerator.alphabets(4)}`,
          name: "Damaged Item",
          description: "Item arrived damaged",
          applies_to_cancellation: false,
          applies_to_refund: true,
          is_active: true,
        } satisfies IShoppingMallRefundRequestReason.ICreate,
      },
    );
  typia.assert(reason);

  // 11. Create multiple refund requests with different requested_total_amount
  const createRefundRequest = async (
    order: IShoppingMallOrder,
    payment: IShoppingMallOrderPayment,
    amount: number,
  ): Promise<IShoppingMallRefundRequest> => {
    const created: IShoppingMallRefundRequest =
      await api.functional.shoppingMall.admin.refundRequests.create(
        connection,
        {
          body: {
            shopping_mall_order_id: order.id,
            shopping_mall_order_payment_id: payment.id,
            shopping_mall_customer_id: customer.id,
            shopping_mall_seller_id: null,
            shopping_mall_admin_id: admin.id,
            shopping_mall_refund_request_reason_id: reason.id,
            shopping_mall_cancellation_request_id: null,
            shopping_mall_case_sla_config_id: null,
            requested_total_amount: amount,
            currency_code: order.currency_code,
            reason_description: "Test refund request",
            requested_by_actor_type: "customer",
            requires_return: false,
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    typia.assert(created);
    return created;
  };

  const refundRequested = await createRefundRequest(
    orderSmall,
    paymentSmall,
    100,
  );
  const refundPartial = await createRefundRequest(
    orderLarge,
    paymentLarge,
    200,
  );
  const refundFull = await createRefundRequest(orderLarge, paymentLarge, 300);

  const createdRefunds: IShoppingMallRefundRequest[] = [
    refundRequested,
    refundPartial,
    refundFull,
  ];

  // 12. Call refunds-by-status statistics as admin
  const stats: IShoppingMallRefundsByStatusStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.refundsByStatus.index(
      connection,
    );
  typia.assert(stats);

  // 13. Aggregate expectations from created refund requests by their actual
  //     status and requested_total_amount
  const expectedByStatus = new Map<string, { count: number; amount: number }>();

  for (const r of createdRefunds) {
    const key = r.status;
    const current = expectedByStatus.get(key) ?? { count: 0, amount: 0 };
    current.count += 1;
    current.amount += r.requested_total_amount;
    expectedByStatus.set(key, current);
  }

  // 14. Validate that each expected status bucket exists and matches
  for (const [statusKey, expected] of expectedByStatus.entries()) {
    const bucket = stats.statuses.find((b) => b.status === statusKey);

    TestValidator.predicate(
      `statistics must contain bucket for status ${statusKey}`,
      bucket !== undefined,
    );

    if (!bucket) continue;

    TestValidator.equals(
      `refundCount for status ${statusKey}`,
      bucket.refundCount,
      expected.count,
    );

    TestValidator.equals(
      `totalRefundAmount for status ${statusKey}`,
      bucket.totalRefundAmount,
      expected.amount,
    );
  }

  // 15. Totals: sum buckets and compare with overall totals
  const summedCount = stats.statuses.reduce((acc, b) => acc + b.refundCount, 0);
  const summedAmount = stats.statuses.reduce(
    (acc, b) => acc + b.totalRefundAmount,
    0,
  );

  TestValidator.equals(
    "totalRefundCount equals sum of bucket refundCount",
    stats.totalRefundCount,
    summedCount,
  );

  TestValidator.equals(
    "totalRefundAmount equals sum of bucket totalRefundAmount",
    stats.totalRefundAmount,
    summedAmount,
  );

  // 16. Currency consistency
  TestValidator.equals(
    "statistics currency matches order currency",
    stats.currency,
    orderSmall.currency_code,
  );
}
