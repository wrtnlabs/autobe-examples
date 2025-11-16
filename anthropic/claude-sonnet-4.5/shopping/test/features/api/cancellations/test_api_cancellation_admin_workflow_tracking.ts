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
 * Test administrator's ability to track cancellation workflow progression
 * through detailed retrieval.
 *
 * This test validates that administrators can retrieve comprehensive
 * cancellation details including approval workflow state, actor identities,
 * timeline tracking, and relationship data to parent orders. The test simulates
 * a complete e-commerce workflow from admin/seller/buyer registration through
 * product listing, order placement, cancellation request, and admin review.
 *
 * Workflow steps:
 *
 * 1. Create admin account for workflow oversight
 * 2. Create seller account and list product (category, sale, SKU)
 * 3. Create buyer account with shipping address and payment method
 * 4. Buyer adds product to cart and creates order
 * 5. Buyer creates cancellation request with specific reason
 * 6. Admin retrieves cancellation details to review workflow state
 * 7. Validate complete cancellation information including status, actors,
 *    timestamps, and relationships
 */
export async function test_api_cancellation_admin_workflow_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for workflow oversight
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create seller account and product listing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.content({ paragraphs: 1 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });

  // Step 3: Create category for product
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 4: Create sale listing as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    condition: "new" as const,
    return_policy_days: 30 as const,
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU for the sale
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(10),
    variant_combination: JSON.stringify({ Color: "Red", Size: "M" }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 6: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 7: Create shipping address for buyer
  const addressData = {
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
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(address);

  // Step 8: Create payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "visa",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_name: RandomGenerator.name(),
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(paymentMethod);

  // Step 9: Add product to cart
  const cartItemData = {
    shopping_mall_sale_sku_id: sku.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: cartItemData,
      },
    );
  typia.assert(cartItem);

  // Step 10: Create order
  const orderData = {
    cart_item_ids: [cartItem.id],
    buyer_address_id: address.id,
    payment_method_id: paymentMethod.id,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: orderData,
    },
  );
  typia.assert(order);

  // Step 11: Create cancellation request with specific reason
  const cancellationData = {
    shopping_mall_order_id: order.id,
    cancellation_reason: "buyer_changed_mind",
    cancellation_explanation: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallOrderCancellation.ICreate;

  const cancellation =
    await api.functional.shoppingMall.buyer.cancellations.create(connection, {
      body: cancellationData,
    });
  typia.assert(cancellation);

  // Step 12: Admin retrieves cancellation details for review
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const retrievedCancellation =
    await api.functional.shoppingMall.admin.cancellations.at(connection, {
      cancellationId: cancellation.id,
    });
  typia.assert(retrievedCancellation);

  // Step 13: Validate cancellation workflow details
  TestValidator.equals(
    "cancellation ID matches created cancellation",
    retrievedCancellation.id,
    cancellation.id,
  );

  TestValidator.equals(
    "cancellation reason is buyer_changed_mind",
    retrievedCancellation.cancellation_reason,
    "buyer_changed_mind",
  );

  TestValidator.equals(
    "approval status is pending",
    retrievedCancellation.approval_status,
    "pending",
  );

  TestValidator.equals(
    "cancellation order reference matches",
    retrievedCancellation.shopping_mall_order_id,
    order.id,
  );

  TestValidator.predicate(
    "requested_at timestamp exists",
    retrievedCancellation.requested_at !== null &&
      retrievedCancellation.requested_at !== undefined,
  );

  TestValidator.predicate(
    "cancellation explanation is preserved",
    retrievedCancellation.cancellation_explanation !== null &&
      retrievedCancellation.cancellation_explanation !== undefined,
  );

  TestValidator.predicate(
    "requested_by_buyer_id is properly tracked",
    retrievedCancellation.requested_by_buyer_id !== null &&
      retrievedCancellation.requested_by_buyer_id !== undefined,
  );
}
