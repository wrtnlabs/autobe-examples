import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
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
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";
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

export async function test_api_customer_dispute_creation_with_refund_and_chargeback(
  connection: api.IConnection,
) {
  // 1. Register and authenticate primary customer
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: customerPassword,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customer.email,
    password: customerPassword,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/home",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerSession: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerSession);

  // 2. Register and authenticate seller
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: sellerPassword,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: seller.email,
    password: sellerPassword,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/home",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerSession);

  // 3. Register and authenticate admin
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminSession: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminSession);

  // 4. Admin: configure country and region
  const countryBody = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = typia.random<IShoppingMallRegion.ICreate>();
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 5. Admin: shipping and payment methods
  const shippingMethodBody =
    typia.random<IShoppingMallShippingMethod.ICreate>();
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = typia.random<IShoppingMallPaymentMethod.ICreate>();
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 6. Seller: product, category, inventory state, SKU
  const productBody = typia.random<IShoppingMallProduct.ICreate>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const categoryBody = typia.random<IShoppingMallCategory.ICreate>();
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

  const inventoryStateBody =
    typia.random<IShoppingMallSkuInventoryState.ICreate>();
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  const skuBody: IShoppingMallSku.ICreate = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 2,
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

  // 7. Customer: cart and address
  const cartCurrency = "USD";
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: cartCurrency,
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 8. Customer: create order
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

  const orderItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cartCurrency,
    items: [orderItemBody],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshot,
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

  // 9. Customer: create order payment
  const paymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
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

  // 10. Admin: refund reason
  const refundReasonBody =
    typia.random<IShoppingMallRefundRequestReason.ICreate>();
  const refundReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: refundReasonBody,
      },
    );
  typia.assert(refundReason);

  // 11. Admin: refund request
  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: admin.id,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: null,
    requested_total_amount: order.grand_total_amount,
    currency_code: order.currency_code,
    reason_description: RandomGenerator.paragraph({ sentences: 3 }),
    requested_by_actor_type: "customer",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestBody,
    });
  typia.assert(refundRequest);

  // 12. Admin: case SLA config
  const slaConfigBody = typia.random<IShoppingMallCaseSlaConfig.ICreate>();
  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigBody,
    });
  typia.assert(slaConfig);

  // 13. Admin: payment chargeback
  const chargebackBody = {
    currency_code: order.currency_code,
    disputed_amount: orderPayment.payable_amount,
    chargeback_amount: orderPayment.payable_amount,
    reason_code: "FRAUD",
    status: "open",
    stage: undefined,
    provider_reference: undefined,
    metadata: undefined,
  } satisfies IShoppingMallPaymentChargeback.ICreate;
  const paymentChargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: chargebackBody,
      },
    );
  typia.assert(paymentChargeback);

  // 14. Admin: risk case
  const riskCaseBody = typia.random<IShoppingMallRiskCase.ICreate>();
  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert(riskCase);

  // 15. Admin: legal hold
  const legalHoldBody = typia.random<IShoppingMallLegalHold.ICreate>();
  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  // 16. Customer: create dispute
  const disputeBody = {
    dispute_code: null,
    type: "refund_dispute",
    severity: "high",
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    opened_at: null,
    shopping_mall_order_id: order.id,
    shopping_mall_refund_request_id: refundRequest.id,
    shopping_mall_payment_chargeback_id: paymentChargeback.id,
    shopping_mall_risk_case_id: riskCase.id,
  } satisfies IShoppingMallDispute.ICreate;
  const dispute: IShoppingMallDispute =
    await api.functional.shoppingMall.customer.disputes.create(connection, {
      body: disputeBody,
    });
  typia.assert(dispute);

  // 17. Assertions on dispute relationships
  TestValidator.equals(
    "dispute.order_id should match order.id",
    dispute.order_id,
    order.id,
  );
  TestValidator.equals(
    "dispute.refund_request_id should match refundRequest.id",
    dispute.refund_request_id,
    refundRequest.id,
  );
  TestValidator.equals(
    "dispute.payment_chargeback_id should match paymentChargeback.id",
    dispute.payment_chargeback_id,
    paymentChargeback.id,
  );
  TestValidator.equals(
    "dispute.risk_case_id should match riskCase.id",
    dispute.risk_case_id,
    riskCase.id,
  );

  if (dispute.order !== null && dispute.order !== undefined) {
    TestValidator.equals(
      "dispute.order summary id matches order.id",
      dispute.order.id,
      order.id,
    );
  }
  if (dispute.refundRequest !== null && dispute.refundRequest !== undefined) {
    TestValidator.equals(
      "dispute.refundRequest summary id matches refundRequest.id",
      dispute.refundRequest.id,
      refundRequest.id,
    );
  }
  if (
    dispute.paymentChargeback !== null &&
    dispute.paymentChargeback !== undefined
  ) {
    TestValidator.equals(
      "dispute.paymentChargeback summary id matches paymentChargeback.id",
      dispute.paymentChargeback.id,
      paymentChargeback.id,
    );
  }
  if (dispute.riskCase !== null && dispute.riskCase !== undefined) {
    TestValidator.equals(
      "dispute.riskCase summary id matches riskCase.id",
      dispute.riskCase.id,
      riskCase.id,
    );
  }
  if (dispute.legalHold !== null && dispute.legalHold !== undefined) {
    TestValidator.equals(
      "dispute.legalHold summary id matches legalHold.id",
      dispute.legalHold.id,
      legalHold.id,
    );
  }
  if (dispute.slaConfig !== null && dispute.slaConfig !== undefined) {
    TestValidator.equals(
      "dispute.slaConfig summary id matches slaConfig.id",
      dispute.slaConfig.id,
      slaConfig.id,
    );
  }

  // 18. Negative test: unauthenticated dispute creation
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated dispute creation fails",
    async () => {
      await api.functional.shoppingMall.customer.disputes.create(unauthConn, {
        body: disputeBody,
      });
    },
  );

  // 19. Negative test: second customer cannot dispute first customer order
  const otherCustomerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const otherCustomerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: otherCustomerPassword,
    href: "https://customer2.example.com/join",
    referrer: "https://customer2.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerJoinBody,
    });
  typia.assert(otherCustomer);

  const otherCustomerLoginBody = {
    email: otherCustomer.email,
    password: otherCustomerPassword,
    href: "https://customer2.example.com/login",
    referrer: "https://customer2.example.com/home",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const otherCustomerSession: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: otherCustomerLoginBody,
    });
  typia.assert(otherCustomerSession);

  const foreignDisputeBody = {
    ...disputeBody,
    dispute_code: null,
  } satisfies IShoppingMallDispute.ICreate;
  await TestValidator.error(
    "dispute creation for foreign order should fail",
    async () => {
      await api.functional.shoppingMall.customer.disputes.create(connection, {
        body: foreignDisputeBody,
      });
    },
  );
}
