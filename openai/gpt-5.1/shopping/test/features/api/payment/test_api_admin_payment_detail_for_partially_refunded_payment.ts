import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import type { IShoppingMallPaymentRefundItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefundItem";
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

export async function test_api_admin_payment_detail_for_partially_refunded_payment(
  connection: api.IConnection,
) {
  // 1. Multi-actor setup: customer, seller, admin
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAfterLogin);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAfterLogin);

  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAfterLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAfterLogin);

  // 2. Admin-created country and region
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 3. Admin category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4. Seller product
  const productCreateBody = {
    code: `prod-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/test-product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Admin links product to category
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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 6. Admin creates purchasable SKU inventory state
  const skuInventoryStateCreateBody = {
    code: `state-${RandomGenerator.alphaNumeric(6)}`,
    name: "In stock",
    description: "Purchasable state for test",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 7. Seller creates SKU for product
  const skuPrice = 10_000;
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: skuPrice,
    original_price: skuPrice,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 8. Admin creates shipping & payment methods
  const shippingMethodCreateBody = {
    method_code: `ship-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Shipping",
    service_level_description: "Test shipping method for e2e",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreateBody = {
    code: `pay-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Payment",
    description: "Test payment method for e2e",
    provider_type: "test_provider",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 9. Customer cart and cart item
  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // 10. Customer shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "1 Test Street",
    line2: "Unit 101",
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 11. Customer order
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32">,
  };

  const shippingAddressSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: addressCreateBody.recipient_name,
      phone_number: addressCreateBody.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: addressCreateBody.postal_code,
      state_or_region: region.name_en,
      city: addressCreateBody.city,
      address_line1: addressCreateBody.line1,
      address_line2: addressCreateBody.line2 ?? null,
    };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotCreate,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );

  const orderItem: IShoppingMallOrderItem = order.items[0];
  typia.assert<IShoppingMallOrderItem>(orderItem);

  // 12. Customer creates logical payment for order
  const payableAmount = order.grand_total_amount;
  const paymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const payment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(payment);

  TestValidator.equals(
    "payment payable amount equals requested",
    payment.payable_amount,
    payableAmount,
  );

  const originalBusinessStatus = payment.business_status;
  const originalCapturedAmount = payment.captured_amount;
  const originalRefundedAmount = payment.refunded_amount;
  const originalUpdatedAt = payment.updated_at;

  // 13. Admin reads payment detail before refunds
  const paymentBeforeRefund: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.admin.payments.at(connection, {
      orderPaymentId: payment.id,
    });
  typia.assert<IShoppingMallOrderPayment>(paymentBeforeRefund);

  TestValidator.equals(
    "admin payment detail id matches payment id",
    paymentBeforeRefund.id,
    payment.id,
  );

  TestValidator.equals(
    "payment refunded_amount initially matches original",
    paymentBeforeRefund.refunded_amount,
    originalRefundedAmount,
  );

  // 14. Admin creates partial refund #1
  const firstRefundApproved = Math.floor(payableAmount * 0.3);
  const refundCreateBody1 = {
    currency_code: payment.currency_code,
    requested_amount: firstRefundApproved,
    approved_amount: firstRefundApproved,
    refunded_amount: 0,
    status: "pending",
    reason_code: "e2e_test_partial_refund_1",
    reason_message: "First partial refund for e2e test",
    provider_reference: undefined,
    metadata: undefined,
  } satisfies IShoppingMallPaymentRefund.ICreate;

  const refund1: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        orderPaymentId: payment.id as string & tags.Format<"uuid">,
        body: refundCreateBody1,
      },
    );
  typia.assert<IShoppingMallPaymentRefund>(refund1);

  TestValidator.equals(
    "refund1 requested_amount equals approved_amount",
    refund1.requested_amount,
    refund1.approved_amount,
  );

  // 15. Admin creates partial refund #2 (smaller amount)
  const secondRefundApproved = Math.floor(payableAmount * 0.1);
  const refundCreateBody2 = {
    currency_code: payment.currency_code,
    requested_amount: secondRefundApproved,
    approved_amount: secondRefundApproved,
    refunded_amount: 0,
    status: "pending",
    reason_code: "e2e_test_partial_refund_2",
    reason_message: "Second partial refund for e2e test",
    provider_reference: undefined,
    metadata: undefined,
  } satisfies IShoppingMallPaymentRefund.ICreate;

  const refund2: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        orderPaymentId: payment.id as string & tags.Format<"uuid">,
        body: refundCreateBody2,
      },
    );
  typia.assert<IShoppingMallPaymentRefund>(refund2);

  TestValidator.predicate(
    "two refunds created with positive approved amounts",
    refund1.approved_amount > 0 && refund2.approved_amount > 0,
  );

  // 16. Admin creates refund item for refund1 against the order item
  const lineRefundAmount1 = firstRefundApproved;
  const refundItemCreateBody1 = {
    shopping_mall_order_item_id: orderItem.id,
    refunded_quantity: 1,
    unit_price_amount: lineRefundAmount1,
    line_refund_amount: lineRefundAmount1,
    reason_code: "e2e_item_reason_1",
  } satisfies IShoppingMallPaymentRefundItem.ICreate;

  const refundItem1: IShoppingMallPaymentRefundItem =
    await api.functional.shoppingMall.admin.payments.refunds.items.create(
      connection,
      {
        orderPaymentId: payment.id as string & tags.Format<"uuid">,
        refundSequence: String(refund1.refund_sequence),
        body: refundItemCreateBody1,
      },
    );
  typia.assert<IShoppingMallPaymentRefundItem>(refundItem1);

  // 17. Re-read payment detail after refunds
  const paymentAfterRefund: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.admin.payments.at(connection, {
      orderPaymentId: payment.id,
    });
  typia.assert<IShoppingMallOrderPayment>(paymentAfterRefund);

  TestValidator.equals(
    "payment id remains the same after refunds",
    paymentAfterRefund.id,
    payment.id,
  );

  TestValidator.predicate(
    "refunded_amount is non-negative",
    paymentAfterRefund.refunded_amount >= 0,
  );

  TestValidator.predicate(
    "refunded_amount does not exceed payable_amount",
    paymentAfterRefund.refunded_amount <= paymentAfterRefund.payable_amount,
  );

  TestValidator.predicate(
    "captured_amount is at least refunded_amount",
    paymentAfterRefund.captured_amount >= paymentAfterRefund.refunded_amount,
  );

  TestValidator.equals(
    "payable_amount is unchanged",
    paymentAfterRefund.payable_amount,
    paymentBeforeRefund.payable_amount,
  );

  TestValidator.predicate(
    "chargeback_amount remains unchanged (typically zero)",
    paymentAfterRefund.chargeback_amount ===
      paymentBeforeRefund.chargeback_amount,
  );

  // We expect that in a partial refund scenario the refunded amount should
  // be less than or equal to payableAmount. If it is positive, we ensure it
  // is strictly less than payableAmount to reflect partial refund semantics.
  TestValidator.predicate(
    "if refunded_amount is positive, it is less than payable_amount",
    paymentAfterRefund.refunded_amount === 0 ||
      paymentAfterRefund.refunded_amount < paymentAfterRefund.payable_amount,
  );

  TestValidator.predicate(
    "business_status remains a non-empty string",
    typeof paymentAfterRefund.business_status === "string" &&
      paymentAfterRefund.business_status.length > 0,
  );

  TestValidator.predicate(
    "updated_at has not moved backwards",
    paymentAfterRefund.updated_at >= originalUpdatedAt,
  );

  // 18. Access control checks: customer and seller must not call admin payment detail
  await TestValidator.error(
    "customer cannot access admin payment detail",
    async () => {
      const customerConn: api.IConnection = { ...connection };
      await api.functional.auth.customer.login(customerConn, {
        body: customerLoginBody,
      });
      await api.functional.shoppingMall.admin.payments.at(customerConn, {
        orderPaymentId: payment.id,
      });
    },
  );

  await TestValidator.error(
    "seller cannot access admin payment detail",
    async () => {
      const sellerConn: api.IConnection = { ...connection };
      await api.functional.auth.seller.login(sellerConn, {
        body: sellerLoginBody,
      });
      await api.functional.shoppingMall.admin.payments.at(sellerConn, {
        orderPaymentId: payment.id,
      });
    },
  );
}
