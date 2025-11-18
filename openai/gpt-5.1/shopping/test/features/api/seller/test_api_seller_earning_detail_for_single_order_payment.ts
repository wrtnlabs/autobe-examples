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
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_seller_earning_detail_for_single_order_payment(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Create country and region
  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 3. Create shipping method
  const shippingMethodBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard domestic shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  // 4. Create payment method
  const paymentMethodBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Standard credit card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 5. Seller joins and logs in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPass123!",
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const sellerId = sellerLoggedIn.id;

  // 6. Seller creates product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.local/images/product.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. Admin creates category and links product
  const categoryBody = {
    parent_id: null,
    slug: `test-category-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: "Category for earning tests",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

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

  // 8. Admin creates SKU inventory state
  const skuInventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 9. Seller creates SKU under product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 10. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPass123!",
    ip: null,
    href: "https://customer.shoppingmall.local/join",
    referrer: "https://customer.shoppingmall.local",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.shoppingmall.local/login",
    referrer: "https://customer.shoppingmall.local",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  const customerId = customerLoggedIn.id;

  // 11. Customer creates cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 12. Customer adds cart item for SKU
  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  // 13. Customer creates address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "San Francisco",
    postal_code: "94107",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 14. Customer creates order from cart
  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  };

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  };

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  TestValidator.equals("order has one item", order.items.length, 1);

  const orderItem = order.items[0];

  // 15. Customer creates logical order payment
  const payableAmount = order.grand_total_amount;

  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentBody,
      },
    );
  typia.assert(orderPayment);

  TestValidator.equals(
    "order payment payable amount matches order grand total",
    orderPayment.payable_amount,
    payableAmount,
  );

  // 16. Admin creates seller earning
  const grossAmount = orderPayment.payable_amount;
  const sellerDiscount = 0;
  const platformDiscount = 0;
  const commissionAmount = Math.round(grossAmount * 0.1 * 100) / 100;
  const otherFeeAmount = 0;
  const netEarning =
    grossAmount - sellerDiscount - commissionAmount - otherFeeAmount;

  const earningBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: orderItem.id,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code,
    gross_amount: grossAmount,
    seller_discount_amount: sellerDiscount,
    platform_discount_amount: platformDiscount,
    commission_amount: commissionAmount,
    other_fee_amount: otherFeeAmount,
    net_earning_amount: netEarning,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: new Date().toISOString(),
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: earningBody,
      },
    );
  typia.assert(earning);

  TestValidator.equals(
    "earning net amount matches computation",
    earning.net_earning_amount,
    netEarning,
  );

  // 17. Seller fetches earning detail
  const earningDetail: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.seller.sellers.earnings.at(connection, {
      sellerId,
      sellerEarningId: earning.id,
    });
  typia.assert(earningDetail);

  // Validate key fields
  TestValidator.equals("earning id matches", earningDetail.id, earning.id);
  TestValidator.equals(
    "earning seller id matches",
    earningDetail.shopping_mall_seller_id,
    sellerId,
  );
  TestValidator.equals(
    "earning order id matches",
    earningDetail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "earning currency matches",
    earningDetail.currency_code,
    earningBody.currency_code,
  );
  TestValidator.equals(
    "earning gross amount matches",
    earningDetail.gross_amount,
    grossAmount,
  );
  TestValidator.equals(
    "earning seller discount amount matches",
    earningDetail.seller_discount_amount,
    sellerDiscount,
  );
  TestValidator.equals(
    "earning platform discount amount matches",
    earningDetail.platform_discount_amount,
    platformDiscount,
  );
  TestValidator.equals(
    "earning commission amount matches",
    earningDetail.commission_amount,
    commissionAmount,
  );
  TestValidator.equals(
    "earning other fee amount matches",
    earningDetail.other_fee_amount,
    otherFeeAmount,
  );
  TestValidator.equals(
    "earning net amount matches",
    earningDetail.net_earning_amount,
    netEarning,
  );
  TestValidator.equals(
    "earning type matches",
    earningDetail.earning_type,
    earningBody.earning_type,
  );
  TestValidator.equals(
    "earning business status matches",
    earningDetail.business_status,
    earningBody.business_status,
  );
  TestValidator.equals(
    "earning eligible_at matches",
    earningDetail.eligible_at,
    earningBody.eligible_at,
  );

  // Validate order summary in earning
  if (earningDetail.order !== undefined) {
    TestValidator.equals(
      "earning order summary id matches",
      earningDetail.order.id,
      order.id,
    );
    TestValidator.equals(
      "earning order summary currency matches",
      earningDetail.order.currency_code,
      order.currency_code,
    );
    TestValidator.equals(
      "earning order summary grand total matches",
      earningDetail.order.grand_total_amount,
      order.grand_total_amount,
    );
  }

  // Validate order item summary in earning
  if (
    earningDetail.orderItem !== null &&
    earningDetail.orderItem !== undefined
  ) {
    TestValidator.equals(
      "earning order item id matches",
      earningDetail.orderItem.id,
      orderItem.id,
    );
    TestValidator.equals(
      "earning order item order id matches",
      earningDetail.orderItem.shopping_mall_order_id,
      order.id,
    );
    TestValidator.equals(
      "earning order item sku id matches",
      earningDetail.orderItem.shopping_mall_sku_id,
      sku.id,
    );
    TestValidator.equals(
      "earning order item line total matches",
      earningDetail.orderItem.line_total,
      orderItem.line_total,
    );
  }

  // Validate order payment summary in earning
  if (
    earningDetail.orderPayment !== null &&
    earningDetail.orderPayment !== undefined
  ) {
    TestValidator.equals(
      "earning order payment id matches",
      earningDetail.orderPayment.id,
      orderPayment.id,
    );
    TestValidator.equals(
      "earning order payment order id matches",
      earningDetail.orderPayment.order.id,
      order.id,
    );
    TestValidator.equals(
      "earning order payment currency matches",
      earningDetail.orderPayment.currency_code,
      orderPayment.currency_code,
    );
    TestValidator.equals(
      "earning order payment payable amount matches",
      earningDetail.orderPayment.payable_amount,
      orderPayment.payable_amount,
    );
    TestValidator.equals(
      "earning order payment captured amount matches",
      earningDetail.orderPayment.captured_amount,
      orderPayment.captured_amount,
    );
    TestValidator.equals(
      "earning order payment refunded amount matches",
      earningDetail.orderPayment.refunded_amount,
      orderPayment.refunded_amount,
    );
    TestValidator.equals(
      "earning order payment chargeback amount matches",
      earningDetail.orderPayment.chargeback_amount,
      orderPayment.chargeback_amount,
    );
    TestValidator.equals(
      "earning order payment business status matches",
      earningDetail.orderPayment.business_status,
      orderPayment.business_status,
    );
  }

  // 18. Negative test: another seller cannot access this earning
  const otherSellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "OtherSellerPass123!",
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const otherSellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: otherSellerJoinBody,
    });
  typia.assert(otherSellerAuthorized);

  const otherSellerLoginBody = {
    email: otherSellerAuthorized.email,
    password: otherSellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const otherSellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: otherSellerLoginBody,
    });
  typia.assert(otherSellerLoggedIn);

  await TestValidator.error(
    "other seller cannot access earning detail",
    async () => {
      await api.functional.shoppingMall.seller.sellers.earnings.at(connection, {
        sellerId: otherSellerLoggedIn.id,
        sellerEarningId: earning.id,
      });
    },
  );
}
