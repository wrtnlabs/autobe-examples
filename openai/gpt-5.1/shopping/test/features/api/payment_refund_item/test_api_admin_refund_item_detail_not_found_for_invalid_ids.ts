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

export async function test_api_admin_refund_item_detail_not_found_for_invalid_ids(
  connection: api.IConnection,
) {
  // 1. Admin join (establish admin actor and token)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://shoppingmall.test/signup",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 3. Seller join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.shoppingmall.test/signup",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Admin creates master data: country, region, shipping method, payment method, sku inventory state
  const countryCreateBody = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = typia.random<IShoppingMallRegion.ICreate>();
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  const shippingMethodCreateBody =
    typia.random<IShoppingMallShippingMethod.ICreate>();
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody =
    typia.random<IShoppingMallPaymentMethod.ICreate>();
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  const skuInventoryStateCreateBody =
    typia.random<IShoppingMallSkuInventoryState.ICreate>();
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 5. Seller-auth context: login as seller and create product + SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = typia.random<IShoppingMallProduct.ICreate>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const skuCreateBodyBase = typia.random<IShoppingMallSku.ICreate>();
  const skuCreateBody = {
    ...skuCreateBodyBase,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer-auth context: login and create cart, address, cart item, order, order payment
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartCreateBody = typia.random<IShoppingMallCart.ICreate>();
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const addressCreateBodyBase =
    typia.random<IShoppingMallCustomerAddress.ICreate>();
  const addressCreateBody = {
    ...addressCreateBodyBase,
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
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

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: cartItem.quantity,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  const orderPaymentCreateBodyBase =
    typia.random<IShoppingMallOrderPayment.ICreate>();
  const orderPaymentCreateBody: IShoppingMallOrderPayment.ICreate = {
    ...orderPaymentCreateBodyBase,
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
  };
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 7. Admin-auth context: login again as admin and create refund header and refund item
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const refundCreateBodyBase =
    typia.random<IShoppingMallPaymentRefund.ICreate>();
  const refundCreateBody: IShoppingMallPaymentRefund.ICreate = {
    ...refundCreateBodyBase,
    currency_code: orderPayment.currency_code,
    requested_amount: orderPayment.payable_amount,
    approved_amount: orderPayment.payable_amount,
    refunded_amount: 0,
  };
  const refundHeader: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: refundCreateBody,
      },
    );
  typia.assert(refundHeader);

  // Choose first order item to refund
  const orderItem: IShoppingMallOrderItem = order.items[0];

  const refundItemCreateBodyBase =
    typia.random<IShoppingMallPaymentRefundItem.ICreate>();
  const refundItemCreateBody: IShoppingMallPaymentRefundItem.ICreate = {
    ...refundItemCreateBodyBase,
    shopping_mall_order_item_id: orderItem.id,
    refunded_quantity: orderItem.quantity,
    unit_price_amount: orderItem.unit_price,
    line_refund_amount: orderItem.line_total,
  };
  const refundItem: IShoppingMallPaymentRefundItem =
    await api.functional.shoppingMall.admin.payments.refunds.items.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        refundSequence: refundHeader.refund_sequence.toString(),
        body: refundItemCreateBody,
      },
    );
  typia.assert(refundItem);

  // 8. Sanity check: successful GET with valid identifiers
  const found: IShoppingMallPaymentRefundItem =
    await api.functional.shoppingMall.admin.payments.refunds.items.at(
      connection,
      {
        orderPaymentId: orderPayment.id,
        refundSequence: refundHeader.refund_sequence.toString(),
        refundItemId: refundItem.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "fetched refund item must match created one",
    found.id,
    refundItem.id,
  );

  // 9.A Non-existent refundItemId
  const nonExistentRefundItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent refundItemId must cause error",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.items.at(
        connection,
        {
          orderPaymentId: orderPayment.id,
          refundSequence: refundHeader.refund_sequence.toString(),
          refundItemId: nonExistentRefundItemId,
        },
      );
    },
  );

  // 9.B Mismatched orderPaymentId with valid refundSequence and refundItemId
  const otherOrderPaymentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "mismatched orderPaymentId must not resolve refund item",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.items.at(
        connection,
        {
          orderPaymentId: otherOrderPaymentId,
          refundSequence: refundHeader.refund_sequence.toString(),
          refundItemId: refundItem.id,
        },
      );
    },
  );

  // 9.C Mismatched refundSequence with valid payment and refundItemId
  const wrongRefundSequence = RandomGenerator.alphaNumeric(8);
  await TestValidator.error(
    "mismatched refundSequence must not resolve refund item",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.items.at(
        connection,
        {
          orderPaymentId: orderPayment.id,
          refundSequence: wrongRefundSequence,
          refundItemId: refundItem.id,
        },
      );
    },
  );

  // 9.D Authorization: customer and seller should not access admin refund item detail
  // Switch to customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  await TestValidator.error(
    "customer must not access admin refund item detail",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.items.at(
        connection,
        {
          orderPaymentId: orderPayment.id,
          refundSequence: refundHeader.refund_sequence.toString(),
          refundItemId: refundItem.id,
        },
      );
    },
  );

  // Switch to seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  await TestValidator.error(
    "seller must not access admin refund item detail",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.items.at(
        connection,
        {
          orderPaymentId: orderPayment.id,
          refundSequence: refundHeader.refund_sequence.toString(),
          refundItemId: refundItem.id,
        },
      );
    },
  );
}
