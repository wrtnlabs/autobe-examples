import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Admin can create a second partial refund on a payment that already has a
 * prior refund.
 *
 * This test performs the full payment setup and two-step refund workflow:
 *
 * 1. Create customer, seller, and admin accounts and login to switch actors.
 * 2. As admin, configure base catalog and payment infrastructure:
 *
 *    - Country and region (used by addresses).
 *    - Shipping method and payment method.
 *    - SKU inventory state (purchasable).
 * 3. As seller, create a product and SKU so the customer can order.
 * 4. As customer, create a cart, address, order, and a logical payment whose
 *    payable_amount matches the order’s grand_total_amount.
 * 5. As admin, create an initial partial refund for 40% of the payment
 *    payable_amount using POST
 *    /shoppingMall/admin/payments/{orderPaymentId}/refunds.
 * 6. As admin, create a second partial refund for another 30% of the
 *    payable_amount on the same payment.
 * 7. Validate that:
 *
 *    - Both refunds belong to the same payment ID.
 *    - The second refund has refund_sequence === 2.
 *    - Each refund’s requested_amount and approved_amount match their intended
 *         shares of the payable_amount.
 *    - The sum of approved_amount across both refunds is less than or equal to
 *         payable_amount (here 70%).
 */
export async function test_api_admin_create_partial_refund_for_partially_refunded_payment(
  connection: api.IConnection,
) {
  // 1. Create customer account and login
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuthorized);

  const customerLoginInput = {
    email: customerAuthorized.email,
    password: customerJoinInput.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginInput,
    });
  typia.assert(customerLogin);

  // 2. Create seller account and login
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginInput = {
    email: sellerAuthorized.email,
    password: sellerJoinInput.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLogin);

  // 3. Create admin account and login
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuthorized);

  const adminLoginInput = {
    email: adminAuthorized.email,
    password: adminJoinInput.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin);

  // 4. As admin, configure geography, shipping and payment
  const countryCreateInput = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateInput,
    });
  typia.assert(country);

  const regionCreateInput = typia.random<IShoppingMallRegion.ICreate>();
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateInput,
      },
    );
  typia.assert(region);

  const shippingMethodCreateInput =
    typia.random<IShoppingMallShippingMethod.ICreate>();
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateInput,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateInput =
    typia.random<IShoppingMallPaymentMethod.ICreate>();
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateInput,
    });
  typia.assert(paymentMethod);

  const skuInventoryStateCreateInput =
    typia.random<IShoppingMallSkuInventoryState.ICreate>();
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateInput,
      },
    );
  typia.assert(skuInventoryState);

  // 5. As seller, create product and SKU
  const sellerProductCreateInput = typia.random<IShoppingMallProduct.ICreate>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateInput,
    });
  typia.assert(product);

  const productCategoryCreateInput =
    typia.random<IShoppingMallProductCategory.ICreate>();
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateInput,
      },
    );
  typia.assert(productCategory);

  const skuCreateInputBase = typia.random<IShoppingMallSku.ICreate>();
  const skuCreateInput: IShoppingMallSku.ICreate = {
    ...skuCreateInputBase,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
  };
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateInput,
    });
  typia.assert(sku);

  // 6. As customer, create cart and address
  const customerCartCreateInput = typia.random<IShoppingMallCart.ICreate>();
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: customerCartCreateInput,
    });
  typia.assert(cart);

  const addressCreateInputBase =
    typia.random<IShoppingMallCustomerAddress.ICreate>();
  const addressCreateInput: IShoppingMallCustomerAddress.ICreate = {
    ...addressCreateInputBase,
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
  };
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressCreateInput,
      },
    );
  typia.assert(address);

  // 7. Create order with a single item for that SKU
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.code,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  };

  const orderCreateInput: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateInput,
    });
  typia.assert(order);

  TestValidator.equals("order has one item", order.items.length, 1);

  // 8. Create a logical payment for the order whose payable_amount matches order grand total
  const paymentCreateInput: IShoppingMallOrderPayment.ICreate = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  };

  const payment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateInput,
      },
    );
  typia.assert(payment);

  TestValidator.equals(
    "payment currency matches order",
    payment.currency_code,
    order.currency_code,
  );

  TestValidator.equals(
    "payment payable amount equals grand total",
    payment.payable_amount,
    order.grand_total_amount,
  );

  // 9. As admin, create first partial refund (40% of payable_amount)
  const firstShare = 0.4;
  const secondShare = 0.3;

  const firstAmount = payment.payable_amount * firstShare;
  const secondAmount = payment.payable_amount * secondShare;

  const firstRefundCreateInput: IShoppingMallPaymentRefund.ICreate = {
    currency_code: payment.currency_code,
    requested_amount: firstAmount,
    approved_amount: firstAmount,
    refunded_amount: 0,
    status: "pending",
    reason_code: "PARTIAL_REFUND_1",
    reason_message: "First partial refund for testing.",
    provider_reference: undefined,
    metadata: undefined,
  };

  const firstRefund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        orderPaymentId: payment.id as string & tags.Format<"uuid">,
        body: firstRefundCreateInput,
      },
    );
  typia.assert(firstRefund);

  TestValidator.equals(
    "first refund payment linkage",
    firstRefund.shopping_mall_order_payment_id,
    payment.id,
  );

  TestValidator.equals(
    "first refund requested amount",
    firstRefund.requested_amount,
    firstAmount,
  );

  TestValidator.equals(
    "first refund approved amount",
    firstRefund.approved_amount,
    firstAmount,
  );

  // 10. Create second partial refund (30% of payable_amount) on same payment
  const secondRefundCreateInput: IShoppingMallPaymentRefund.ICreate = {
    currency_code: payment.currency_code,
    requested_amount: secondAmount,
    approved_amount: secondAmount,
    refunded_amount: 0,
    status: "pending",
    reason_code: "PARTIAL_REFUND_2",
    reason_message: "Second partial refund for testing.",
    provider_reference: undefined,
    metadata: undefined,
  };

  const secondRefund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        orderPaymentId: payment.id as string & tags.Format<"uuid">,
        body: secondRefundCreateInput,
      },
    );
  typia.assert(secondRefund);

  // 11. Validate sequencing and totals
  TestValidator.equals(
    "second refund payment linkage",
    secondRefund.shopping_mall_order_payment_id,
    payment.id,
  );

  TestValidator.equals(
    "second refund requested amount",
    secondRefund.requested_amount,
    secondAmount,
  );

  TestValidator.equals(
    "second refund approved amount",
    secondRefund.approved_amount,
    secondAmount,
  );

  TestValidator.equals("first refund sequence", firstRefund.refund_sequence, 1);

  TestValidator.equals(
    "second refund sequence",
    secondRefund.refund_sequence,
    2,
  );

  const totalApproved =
    firstRefund.approved_amount + secondRefund.approved_amount;
  TestValidator.predicate(
    "total approved refunds within payable",
    totalApproved <= payment.payable_amount,
  );
}
