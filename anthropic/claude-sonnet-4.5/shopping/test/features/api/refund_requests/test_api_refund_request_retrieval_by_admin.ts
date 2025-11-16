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
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_refund_request_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://marketplace.example.com/buyer/register" satisfies string &
        tags.Format<"uri"> as string,
      referrer: "https://marketplace.example.com/home" satisfies string &
        tags.Format<"uri"> as string,
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create delivery address for buyer
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
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(deliveryAddress);

  // Step 3: Register payment method for buyer
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: 2025,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(6),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 4: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.marketplace.example.com/register" satisfies string &
        tags.Format<"uri"> as string,
      referrer: "https://admin.marketplace.example.com/" satisfies string &
        tags.Format<"uri"> as string,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 5: Create product category
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

  // Step 6: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: "https://marketplace.example.com/seller/register" satisfies string &
        tags.Format<"uri"> as string,
      referrer: "https://marketplace.example.com/seller/info" satisfies string &
        tags.Format<"uri"> as string,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 7: Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 20 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 8: Create SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: 99.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 9: Switch back to buyer and add product to cart
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: "https://marketplace.example.com/products" satisfies string &
        tags.Format<"uri"> as string,
      referrer: "https://marketplace.example.com/category" satisfies string &
        tags.Format<"uri"> as string,
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 10: Create order from cart
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 11: Create refund request as buyer
  const refundRequest =
    await api.functional.shoppingMall.buyer.refundRequests.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        refund_reason: "defective_product",
        refund_explanation: RandomGenerator.paragraph({ sentences: 15 }),
        requested_amount: order.total_amount,
        return_required: true,
      } satisfies IShoppingMallRefundRequest.ICreate,
    });
  typia.assert(refundRequest);

  // Step 12: Switch to admin and retrieve the refund request
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.marketplace.example.com/refunds" satisfies string &
        tags.Format<"uri"> as string,
      referrer:
        "https://admin.marketplace.example.com/dashboard" satisfies string &
          tags.Format<"uri"> as string,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const retrievedRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.at(connection, {
      refundRequestId: refundRequest.id,
    });
  typia.assert(retrievedRefundRequest);

  // Step 13: Validate refund request details
  TestValidator.equals(
    "refund request ID matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "order ID matches",
    retrievedRefundRequest.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "buyer ID matches",
    retrievedRefundRequest.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "refund reason matches",
    retrievedRefundRequest.refund_reason,
    refundRequest.refund_reason,
  );
  TestValidator.equals(
    "refund explanation matches",
    retrievedRefundRequest.refund_explanation,
    refundRequest.refund_explanation,
  );
  TestValidator.equals(
    "requested amount matches",
    retrievedRefundRequest.requested_amount,
    refundRequest.requested_amount,
  );
  TestValidator.equals(
    "return required flag matches",
    retrievedRefundRequest.return_required,
    refundRequest.return_required,
  );
  TestValidator.equals(
    "refund status is requested",
    retrievedRefundRequest.status,
    "requested",
  );
  TestValidator.predicate(
    "buyer information is populated",
    retrievedRefundRequest.buyer !== null &&
      retrievedRefundRequest.buyer !== undefined,
  );
  TestValidator.predicate(
    "order information is populated",
    retrievedRefundRequest.order !== null &&
      retrievedRefundRequest.order !== undefined,
  );
  TestValidator.equals(
    "buyer email matches in summary",
    retrievedRefundRequest.buyer.email,
    buyerEmail,
  );
  TestValidator.equals(
    "order number matches in summary",
    retrievedRefundRequest.order.order_number,
    order.order_number,
  );
}
