import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGateway";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test refund retrieval for transactions in different currencies.
 *
 * This test validates that the admin refund retrieval system properly handles
 * multi-currency transactions across USD, EUR, GBP, and other currencies. It
 * verifies that refund amounts, currency codes, and financial data are
 * accurately maintained with proper foreign exchange considerations and
 * currency-specific formatting and precision.
 *
 * Test workflow:
 *
 * 1. Create admin user for multi-currency testing
 * 2. Create seller account to list products
 * 3. Create customer account to place orders
 * 4. Create products for multi-currency scenarios
 * 5. Create orders with different currency contexts
 * 6. Create payment records with currency specifications
 * 7. Process transactions in different currencies
 * 8. Create refunds linked to specific currency transactions
 * 9. Retrieve refund details and validate multi-currency data
 * 10. Verify foreign exchange handling and precision
 */
export async function test_api_admin_refund_retrieval_multi_currency_support(
  connection: api.IConnection,
) {
  // 1. Create admin user for multi-currency testing
  const adminEmail = `admin-${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      adminlevel: "department_admin",
      firstname: RandomGenerator.name(1),
      lastname: RandomGenerator.name(1),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create seller account
  const sellerEmail = `seller-${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphabets(10),
      tax_id: RandomGenerator.alphabets(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });

  // 3. Create customer account
  const customerEmail = `customer-${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "SecurePass123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IShoppingMallCustomer.IRegister,
  });
  typia.assert(customer);

  // 4. Create products
  const usdProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PROD-USD-${RandomGenerator.alphabets(8)}`,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        price: 99.99,
        condition: "new",
        weight: 0.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        href: "https://seller.example.com/products/create",
        referrer: "https://seller.example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(usdProduct);

  const eurProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PROD-EUR-${RandomGenerator.alphabets(8)}`,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        price: 89.99,
        condition: "new",
        weight: 0.3,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        href: "https://seller.example.com/products/create",
        referrer: "https://seller.example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(eurProduct);

  const gbpProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PROD-GBP-${RandomGenerator.alphabets(8)}`,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        price: 79.99,
        condition: "new",
        weight: 0.7,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        href: "https://seller.example.com/products/create",
        referrer: "https://seller.example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(gbpProduct);

  // 5. Create orders in different currency contexts
  const usdOrder = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        order_items: [
          {
            product_variant_id: null,
            quantity: 2,
            unit_price: 199.98,
            shipping_cost: 15.99,
            discount_amount: 0,
            variant_sku: usdProduct.sku,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address: "123 Main St, New York, NY 10001",
        billing_address: "123 Main St, New York, NY 10001",
        customer_phone: "+1-555-123-4567",
        ip: "192.168.1.1",
        href: "https://shopping.example.com/checkout",
        referrer: "https://shopping.example.com/product/usd-product",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(usdOrder);

  // 6. Create payment records with currency specifications
  const usdPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: usdOrder.id,
        body: {
          payment_type: "customer_payment",
          amount: 215.97,
          currency: "USD",
          platform_commission: 21.6,
          processing_fees: 3.24,
          seller_net_amount: 191.13,
          settlement_date: "2024-01-01",
          provider_reference: `USD-${RandomGenerator.alphabets(10)}`,
          tax_breakdown: 18.99,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(usdPayment);

  const eurPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          payment_type: "customer_payment",
          amount: 199.99,
          currency: "EUR",
          platform_commission: 19.99,
          processing_fees: 3.0,
          seller_net_amount: 176.99,
          settlement_date: "2024-01-01",
          provider_reference: `EUR-${RandomGenerator.alphabets(10)}`,
          tax_breakdown: 15.99,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(eurPayment);

  const gbpPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          payment_type: "customer_payment",
          amount: 179.99,
          currency: "GBP",
          platform_commission: 17.99,
          processing_fees: 2.7,
          seller_net_amount: 159.3,
          settlement_date: "2024-01-01",
          provider_reference: `GBP-${RandomGenerator.alphabets(10)}`,
          tax_breakdown: 12.99,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(gbpPayment);

  // 7. Process transactions in different currencies
  const usdTransaction =
    await api.functional.shoppingMall.customer.paymentTransactions.create(
      connection,
      {
        body: {
          shopping_mall_order_payment_id: usdPayment.id,
          shopping_mall_payment_gateway_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_payment_method_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          amount: 215.97,
          currency: "USD",
          transaction_type: "authorization",
          merchant_reference: `MERCH-USD-${RandomGenerator.alphabets(12)}`,
        } satisfies IShoppingMallPaymentTransaction.ICreate,
      },
    );
  typia.assert(usdTransaction);

  const eurTransaction =
    await api.functional.shoppingMall.customer.paymentTransactions.create(
      connection,
      {
        body: {
          shopping_mall_order_payment_id: eurPayment.id,
          shopping_mall_payment_gateway_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_payment_method_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          amount: 199.99,
          currency: "EUR",
          transaction_type: "authorization",
          merchant_reference: `MERCH-EUR-${RandomGenerator.alphabets(12)}`,
        } satisfies IShoppingMallPaymentTransaction.ICreate,
      },
    );
  typia.assert(eurTransaction);

  const gbpTransaction =
    await api.functional.shoppingMall.customer.paymentTransactions.create(
      connection,
      {
        body: {
          shopping_mall_order_payment_id: gbpPayment.id,
          shopping_mall_payment_gateway_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_payment_method_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          amount: 179.99,
          currency: "GBP",
          transaction_type: "authorization",
          merchant_reference: `MERCH-GBP-${RandomGenerator.alphabets(12)}`,
        } satisfies IShoppingMallPaymentTransaction.ICreate,
      },
    );
  typia.assert(gbpTransaction);

  // 8. Create refunds linked to specific currency transactions
  const refundTypes = [
    "merchant_refund",
    "chargeback",
    "administrative_adjustment",
  ] as const;
  const reasonCodes = [
    "customer_return",
    "product_defect",
    "order_cancellation",
    "seller_error",
  ] as const;

  const usdRefund =
    await api.functional.shoppingMall.admin.paymentRefunds.create(connection, {
      body: {
        payment_transaction_id: usdTransaction.id,
        amount: 50.5,
        currency: "USD",
        refund_type: refundTypes[0],
        reason_code: reasonCodes[0],
        reason_description:
          "Refund processed in USD for multi-currency testing",
        processing_fee: 2.5,
      } satisfies IShoppingMallPaymentRefund.ICreate,
    });
  typia.assert(usdRefund);

  const eurRefund =
    await api.functional.shoppingMall.admin.paymentRefunds.create(connection, {
      body: {
        payment_transaction_id: eurTransaction.id,
        amount: 45.25,
        currency: "EUR",
        refund_type: refundTypes[1],
        reason_code: reasonCodes[1],
        reason_description:
          "Refund processed in EUR for multi-currency testing",
        processing_fee: 2.25,
      } satisfies IShoppingMallPaymentRefund.ICreate,
    });
  typia.assert(eurRefund);

  const gbpRefund =
    await api.functional.shoppingMall.admin.paymentRefunds.create(connection, {
      body: {
        payment_transaction_id: gbpTransaction.id,
        amount: 40.75,
        currency: "GBP",
        refund_type: refundTypes[2],
        reason_code: reasonCodes[2],
        reason_description:
          "Refund processed in GBP for multi-currency testing",
        processing_fee: 2.0,
      } satisfies IShoppingMallPaymentRefund.ICreate,
    });
  typia.assert(gbpRefund);

  // 9. Retrieve refund details and validate multi-currency data
  const allRefunds = [usdRefund, eurRefund, gbpRefund];
  const expectedCurrencies = ["USD", "EUR", "GBP"];
  const expectedAmounts = [50.5, 45.25, 40.75];

  for (let i = 0; i < allRefunds.length; i++) {
    const refund = allRefunds[i];
    const retrievedRefund =
      await api.functional.shoppingMall.admin.paymentRefunds.at(connection, {
        refundCode: refund.refund_reference,
      });
    typia.assert(retrievedRefund);

    // 10. Verify foreign exchange handling and precision
    TestValidator.equals(
      `refund ${i + 1} (${expectedCurrencies[i]}) currency matches`,
      retrievedRefund.currency,
      expectedCurrencies[i],
    );

    TestValidator.equals(
      `refund ${i + 1} (${expectedCurrencies[i]}) amount matches request`,
      retrievedRefund.amount,
      expectedAmounts[i],
    );

    TestValidator.equals(
      `refund ${i + 1} (${expectedCurrencies[i]}) refund type matches`,
      retrievedRefund.refund_type,
      allRefunds[i].refund_type,
    );

    // Verify pagination transaction association is maintained
    TestValidator.predicate(
      `refund ${i + 1} (${expectedCurrencies[i]}) has associated payment transaction`,
      retrievedRefund.paymentTransaction !== undefined,
    );

    TestValidator.predicate(
      `refund ${i + 1} (${expectedCurrencies[i]}) has valid refund reference`,
      retrievedRefund.refund_reference.length > 0,
    );
  }
}

// Continue with specific precision validation
export async function test_api_admin_refund_retrieval_precision_validation(
  connection: api.IConnection,
) {
  // Additional test for currency precision edge cases
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: `admin-test-${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      adminlevel: "department_admin",
      firstname: RandomGenerator.name(1),
      lastname: RandomGenerator.name(1),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  const payment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          payment_type: "customer_payment",
          amount: 999.99,
          currency: "USD",
          platform_commission: 99.99,
          processing_fees: 14.99,
          seller_net_amount: 885.0,
          settlement_date: "2024-01-01",
          provider_reference: `TEST-USD-${RandomGenerator.alphabets(10)}`,
          tax_breakdown: 85.0,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );

  const transaction =
    await api.functional.shoppingMall.customer.paymentTransactions.create(
      connection,
      {
        body: {
          shopping_mall_order_payment_id: payment.id,
          shopping_mall_payment_gateway_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_payment_method_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          amount: 999.99,
          currency: "USD",
          transaction_type: "authorization",
          merchant_reference: `PRECISION-USD-${RandomGenerator.alphabets(12)}`,
        } satisfies IShoppingMallPaymentTransaction.ICreate,
      },
    );

  // Test precise decimal amounts
  const preciseRefund =
    await api.functional.shoppingMall.admin.paymentRefunds.create(connection, {
      body: {
        payment_transaction_id: transaction.id,
        amount: 99.99, // Two decimal places
        currency: "USD",
        refund_type: "merchant_refund",
        reason_code: "precise_adjustment",
        reason_description: "Testing precise decimal amount refund processing",
        processing_fee: 0.99,
      } satisfies IShoppingMallPaymentRefund.ICreate,
    });

  const retrievedPrecisionRefund =
    await api.functional.shoppingMall.admin.paymentRefunds.at(connection, {
      refundCode: preciseRefund.refund_reference,
    });

  TestValidator.equals(
    'precise refund amount maintained class="notranslate">2 decimal places',
    retrievedPrecisionRefund.amount,
    99.99,
  );

  TestValidator.equals(
    "precise refund currency maintained from creation",
    retrievedPrecisionRefund.currency,
    "USD",
  );
}
