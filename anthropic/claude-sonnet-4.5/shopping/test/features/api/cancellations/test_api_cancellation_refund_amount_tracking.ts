import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the refund amount specification and tracking during cancellation
 * approval workflow.
 *
 * This comprehensive test validates the platform's ability to track and
 * document exact refund amounts when administrators approve order
 * cancellations. The scenario simulates a complete e-commerce workflow from
 * product listing through order placement to cancellation with custom refund
 * amount processing.
 *
 * Business context: In real-world e-commerce, refund amounts often differ from
 * original order totals due to restocking fees, non-refundable payment
 * processing costs, partial cancellations, or promotional discount adjustments.
 * This test ensures the platform supports flexible refund amount specification
 * during cancellation approval.
 *
 * Test workflow:
 *
 * 1. Create admin, seller, and buyer accounts with proper authentication
 * 2. Admin establishes product category taxonomy
 * 3. Seller lists a product with SKU and known pricing ($99.99 base price)
 * 4. Buyer creates delivery address and payment method
 * 5. Buyer adds product to cart and completes order ($99.99 + shipping/tax)
 * 6. Buyer submits cancellation request with reason
 * 7. Admin approves cancellation with custom refund amount ($95.00 after $4.99
 *    restocking fee)
 * 8. Validate refund_amount is accurately recorded in cancellation record
 *
 * Financial transparency validation:
 *
 * - Verify refund_amount is persisted in the cancellation entity
 * - Confirm refund amount differs from original order total when applicable
 * - Ensure cancellation record provides audit trail for reconciliation
 */
export async function test_api_cancellation_refund_amount_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for cancellation processing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale with known price
  const saleCode = RandomGenerator.alphaNumeric(12);
  const basePrice = 99.99;
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU with specific base price
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Size: "Medium", Color: "Blue" }),
        base_price: basePrice,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create buyer account and authenticate
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 7: Buyer creates delivery address
  const deliveryAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(deliveryAddress);

  // Step 8: Buyer registers payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: "4242",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 9: Buyer adds product to cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 10: Buyer creates order from cart
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
        notes: "Please deliver carefully",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Validate order was created with expected structure
  TestValidator.predicate("order has items", order.items.length > 0);
  TestValidator.predicate("order total is positive", order.total_amount > 0);

  // Step 11: Buyer submits cancellation request
  const cancellationReason = "buyer_changed_mind";
  const cancellation =
    await api.functional.shoppingMall.buyer.cancellations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        cancellation_reason: cancellationReason,
        cancellation_explanation: "Found better price elsewhere",
      } satisfies IShoppingMallOrderCancellation.ICreate,
    });
  typia.assert(cancellation);

  // Validate cancellation was created in pending status
  TestValidator.equals(
    "cancellation status is pending",
    cancellation.approval_status,
    "pending",
  );
  TestValidator.equals(
    "cancellation order reference",
    cancellation.shopping_mall_order_id,
    order.id,
  );

  // Step 12: Switch to admin context for cancellation approval
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 13: Admin approves cancellation with custom refund amount
  const restockingFee = 4.99;
  const refundAmount = order.total_amount - restockingFee;

  const approvedCancellation =
    await api.functional.shoppingMall.admin.cancellations.update(connection, {
      cancellationId: cancellation.id,
      body: {
        approval_status: "admin_approved",
        refund_amount: refundAmount,
      } satisfies IShoppingMallOrderCancellation.IUpdate,
    });
  typia.assert(approvedCancellation);

  // Step 14: Validate refund amount tracking
  TestValidator.equals(
    "cancellation status updated to admin_approved",
    approvedCancellation.approval_status,
    "admin_approved",
  );

  TestValidator.predicate(
    "refund amount is recorded",
    approvedCancellation.refund_amount !== null &&
      approvedCancellation.refund_amount !== undefined,
  );

  const recordedRefund = typia.assert(approvedCancellation.refund_amount!);
  TestValidator.equals(
    "refund amount matches calculated value",
    recordedRefund,
    refundAmount,
  );

  TestValidator.predicate(
    "refund amount differs from order total due to restocking fee",
    recordedRefund < order.total_amount,
  );

  TestValidator.predicate(
    "approved timestamp is recorded",
    approvedCancellation.approved_at !== null &&
      approvedCancellation.approved_at !== undefined,
  );
}
