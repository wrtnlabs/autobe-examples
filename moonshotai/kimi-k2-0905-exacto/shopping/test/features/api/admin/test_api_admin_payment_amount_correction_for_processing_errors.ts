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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin ability to correct payment amounts when processing errors occur,
 * such as incorrect fee calculations or commission adjustments. This verifies
 * the financial integrity maintenance where administrators can manually adjust
 * transaction components including platform commission, processing fees, and
 * seller net amounts while maintaining proper audit trails through updated_at
 * timestamps. The scenario validates amount field modifications preserve
 * mathematical relationships between payment components.
 */
export async function test_api_admin_payment_amount_correction_for_processing_errors(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for payment modification privileges
  const adminEmail = `admin_${typia.random<string & tags.Format<"uuid">>()}@marketplace.com`;
  const adminPassword = `Admin_${RandomGenerator.alphaNumeric(12)}!#`;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      firstname: RandomGenerator.name(1),
      lastname: RandomGenerator.name(1),
      adminlevel: "super_admin",
      department: "Finance",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create customer account for transaction origination
  const customerEmail = `customer_${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "SecurePassword123!", // Use prescribed example password
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      href: "https://marketplace.com/register",
      referrer: "https://marketplace.com/browse",
    } satisfies IShoppingMallCustomer.IRegister,
  });
  typia.assert(customer);

  // Step 3: Create seller account for commission and payout calculations
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: `seller_${typia.random<string & tags.Format<"uuid">>()}@business.com`,
      business_name: `${RandomGenerator.name()} Corp`,
      business_registration_number: `REG${RandomGenerator.alphaNumeric(3)}${typia.random<number & tags.Minimum<1000> & tags.Maximum<9999>>()}`,
      tax_id: `TAX${RandomGenerator.alphaNumeric(5)}${typia.random<number & tags.Minimum<100> & tags.Maximum<999>>()}`,
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 4: Create product for order generation
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<10000>
  >();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `SKU_${typia.random<string & tags.Format<"uuid">>()}`,
        name: `${RandomGenerator.name()} Premium Product`,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        price: basePrice,
        compare_at_price: basePrice * 1.2,
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
        >(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id, // Use actual seller ID
        href: "https://marketplace.com/seller/product/create",
        referrer: "https://marketplace.com/seller/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Create order for payment testing
  const orderTotal = basePrice;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        order_items: [
          {
            quantity: 1,
            unit_price: basePrice,
            variant_sku: product.sku,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shipping_address: `${RandomGenerator.name()} Street, Commerce City, EC 12345`,
        billing_address: `${RandomGenerator.name()} Corporate Center, Finance District, FD 56789`,
        customer_phone: customer.phone ?? RandomGenerator.mobile(),
        href: "https://marketplace.com/checkout",
        referrer: "https://marketplace.com/cart",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 6: Create initial payment record
  const platformCommission = Math.round(orderTotal * 0.028 * 100) / 100; // 2.8% marketplace commission
  const processingFees = Math.round(orderTotal * 0.032 * 100) / 100; // 3.2% payment processing fees
  const sellerNetAmount =
    Math.round((orderTotal - platformCommission - processingFees) * 100) / 100;

  const originalPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_type: "customer_payment",
          amount: orderTotal,
          currency: order.currency,
          platform_commission: platformCommission,
          processing_fees: processingFees,
          seller_net_amount: sellerNetAmount,
          settlement_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 3 days from now
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(originalPayment);

  // Verify original payment amounts maintain mathematical relationships
  TestValidator.predicate(
    "original payment amounts preserve mathematical integrity",
    Math.abs((originalPayment.platform_commission ?? 0) - platformCommission) <
      0.01 &&
      Math.abs((originalPayment.processing_fees ?? 0) - processingFees) <
        0.01 &&
      Math.abs((originalPayment.seller_net_amount ?? 0) - sellerNetAmount) <
        0.01,
  );

  // Step 7: Simulate payment processing error requiring admin correction
  // Incorrect fee calculation discovered (should be 3.5% commission, 3.0% processing)
  const correctedCommission = Math.round(orderTotal * 0.035 * 100) / 100; // 3.5% corrected commission
  const correctedProcessingFees = Math.round(orderTotal * 0.03 * 100) / 100; // 3.0% corrected processing
  const correctedSellerNet =
    Math.round(
      (orderTotal - correctedCommission - correctedProcessingFees) * 100,
    ) / 100;

  // Step 8: Admin logs in to make correction
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword, // Use the password from admin creation
      href: "https://marketplace.com/admin/dashboard",
      referrer: "https://marketplace.com/admin/login",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 9: Admin updates payment amounts to correct processing errors
  const updatedPayment =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: order.id,
      paymentId: originalPayment.id,
      body: {
        amount: orderTotal, // Total remains the same
        platform_commission: correctedCommission,
        processing_fees: correctedProcessingFees,
        seller_net_amount: correctedSellerNet,
        settlement_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // Corrected to 2 days for faster payout
      } satisfies IShoppingMallOrderPayment.IUpdate,
    });
  typia.assert(updatedPayment);

  // Step 10: Validate corrected amounts maintain financial relationships
  TestValidator.equals(
    "corrected total amount equals original order total",
    updatedPayment.amount,
    orderTotal,
  );

  TestValidator.predicate(
    "corrected amounts preserve updated mathematical relationships",
    Math.abs((updatedPayment.platform_commission ?? 0) - correctedCommission) <
      0.01 &&
      Math.abs(
        (updatedPayment.processing_fees ?? 0) - correctedProcessingFees,
      ) < 0.01 &&
      Math.abs((updatedPayment.seller_net_amount ?? 0) - correctedSellerNet) <
        0.01,
  );

  // Verify the accounting formula: Total = Commission + Processing + Seller Net
  const calculatedTotal =
    (updatedPayment.platform_commission ?? 0) +
    (updatedPayment.processing_fees ?? 0) +
    (updatedPayment.seller_net_amount ?? 0);

  TestValidator.predicate(
    "corrected payment components sum to order total",
    Math.abs(calculatedTotal - orderTotal) < 0.01,
  );

  // Step 11: Verify audit trail through timestamps
  TestValidator.predicate(
    "updated payment has more recent timestamp than original",
    new Date(updatedPayment.updated_at).getTime() >
      new Date(originalPayment.updated_at).getTime(),
  );

  // Step 12: Test error corrections are preserved in payment status
  TestValidator.predicate(
    "payment maintains appropriate status after amount correction",
    updatedPayment.status !== null && updatedPayment.status !== undefined,
  );

  // Step 13: Validate reconciliation status updates appropriately
  TestValidator.predicate(
    "reconciliation status updated to false after payment correction",
    updatedPayment.is_reconciled === false,
  );
}
