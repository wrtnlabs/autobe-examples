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

/**
 * Validate that admin can partially update only metadata fields of a seller
 * earning.
 *
 * Business flow:
 *
 * 1. Create customer, seller, and admin accounts and authenticate as each role
 *    when needed.
 * 2. As admin, create a country and region to support customer addresses.
 * 3. As admin, create a shipping method and payment method configurations.
 * 4. As seller, create a product, inventory state, and SKU.
 * 5. As customer, create a cart, add the SKU as a cart item, and then create an
 *    order that purchases that item using a shipping address snapshot.
 * 6. As customer, create a logical payment for the order.
 * 7. As admin, create an initial seller earning record for the seller, linked to
 *    the order, order item, and order payment.
 * 8. As admin, call PUT
 *    /shoppingMall/admin/sellers/{sellerId}/earnings/{sellerEarningId} with
 *    IShoppingMallSellerEarning.IUpdate containing only earning_type and
 *    metadata fields.
 * 9. Verify that the response has updated earning_type and metadata while all
 *    monetary and ownership fields remain unchanged.
 * 10. Perform another metadata-only update that omits metadata (updates only
 *     earning_type) and verify that metadata is preserved from the previous
 *     update, proving partial update behavior.
 */
export async function test_api_admin_updates_seller_earning_metadata_only(
  connection: api.IConnection,
) {
  // 1. Create a customer account and log them in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 1-2. Create a seller account and log them in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 1-3. Create an admin account and log in as admin for configuration and earning operations
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1n-" + RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/login-ref" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. As admin, create a country and region
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

  // 3. As admin, create shipping and payment methods
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
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

  // 4. As seller, log in and create a product
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/login-ref" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4-1. As admin, create a category and link product to category
  const categoryBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronics category",
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

  // 4-2. As admin, create inventory state used for SKU
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 4-3. As seller, create a SKU under the product
  const skuBody = {
    code: "SKU-CODE-" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 1,
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

  // 5. As customer, log in and create a cart, then add SKU as a cart item
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/login-ref" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

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

  // 6. As customer, create an order from the cart with a shipping address snapshot
  const shippingAddressSnapshotBody = {
    recipient_name: "Test Customer",
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "90001",
    state_or_region: region.code,
    city: "Los Angeles",
    address_line1: "123 Test Street",
    address_line2: "Suite 101",
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver during business hours.",
    platform_note: "",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order contains at least one item",
    order.items.length > 0,
  );

  const orderItem: IShoppingMallOrderItem = order.items[0];

  // 7. As customer, create a logical payment for the order
  const payableAmount: number = order.grand_total_amount;
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

  // 8. As admin, create an initial seller earning linked to this order, item, and payment
  const earningCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: orderItem.id,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code,
    gross_amount: orderItem.line_total,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: orderItem.line_total * 0.1,
    other_fee_amount: 0,
    net_earning_amount: orderItem.line_total * 0.9,
    earning_type: "order_item",
    business_status: "pending",
    eligible_at: null,
    reversed_at: null,
    metadata: JSON.stringify({ source: "initial", note: "created for test" }),
  } satisfies IShoppingMallSellerEarning.ICreate;
  const initialEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerId,
        body: earningCreateBody,
      },
    );
  typia.assert(initialEarning);

  // Capture baseline monetary and ownership fields
  const baselineGrossAmount: number = initialEarning.gross_amount;
  const baselineSellerDiscountAmount: number =
    initialEarning.seller_discount_amount;
  const baselinePlatformDiscountAmount: number =
    initialEarning.platform_discount_amount;
  const baselineCommissionAmount: number = initialEarning.commission_amount;
  const baselineOtherFeeAmount: number = initialEarning.other_fee_amount;
  const baselineNetEarningAmount: number = initialEarning.net_earning_amount;
  const baselineCurrencyCode: string = initialEarning.currency_code;
  const baselineBusinessStatus: string = initialEarning.business_status;
  const baselineOrderId: string & tags.Format<"uuid"> =
    initialEarning.shopping_mall_order_id;
  const baselineOrderItemId: (string & tags.Format<"uuid">) | null | undefined =
    initialEarning.shopping_mall_order_item_id;
  const baselineOrderPaymentId:
    | (string & tags.Format<"uuid">)
    | null
    | undefined = initialEarning.shopping_mall_order_payment_id;
  const baselineSellerId: string & tags.Format<"uuid"> =
    initialEarning.shopping_mall_seller_id;

  // 9. As admin, perform metadata-only partial update: update earning_type and metadata only
  const newMetadata = JSON.stringify({
    source: "admin-update",
    comment: RandomGenerator.paragraph({ sentences: 4 }),
  });

  const firstUpdateBody = {
    earning_type: "manual_adjustment",
    metadata: newMetadata,
  } satisfies IShoppingMallSellerEarning.IUpdate;
  const firstUpdated: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.update(
      connection,
      {
        sellerId: sellerId,
        sellerEarningId: initialEarning.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstUpdated);

  // Verify earning_type and metadata changed
  TestValidator.equals(
    "earning_type is updated by metadata-only patch",
    firstUpdated.earning_type,
    "manual_adjustment",
  );
  TestValidator.equals(
    "metadata is updated by metadata-only patch",
    firstUpdated.metadata,
    newMetadata,
  );

  // Verify monetary fields remain unchanged
  TestValidator.equals(
    "gross_amount remains unchanged after metadata-only patch",
    firstUpdated.gross_amount,
    baselineGrossAmount,
  );
  TestValidator.equals(
    "seller_discount_amount remains unchanged after metadata-only patch",
    firstUpdated.seller_discount_amount,
    baselineSellerDiscountAmount,
  );
  TestValidator.equals(
    "platform_discount_amount remains unchanged after metadata-only patch",
    firstUpdated.platform_discount_amount,
    baselinePlatformDiscountAmount,
  );
  TestValidator.equals(
    "commission_amount remains unchanged after metadata-only patch",
    firstUpdated.commission_amount,
    baselineCommissionAmount,
  );
  TestValidator.equals(
    "other_fee_amount remains unchanged after metadata-only patch",
    firstUpdated.other_fee_amount,
    baselineOtherFeeAmount,
  );
  TestValidator.equals(
    "net_earning_amount remains unchanged after metadata-only patch",
    firstUpdated.net_earning_amount,
    baselineNetEarningAmount,
  );

  // Verify ownership and status fields remain unchanged
  TestValidator.equals(
    "currency_code remains unchanged after metadata-only patch",
    firstUpdated.currency_code,
    baselineCurrencyCode,
  );
  TestValidator.equals(
    "business_status remains unchanged after metadata-only patch",
    firstUpdated.business_status,
    baselineBusinessStatus,
  );
  TestValidator.equals(
    "shopping_mall_seller_id remains unchanged after metadata-only patch",
    firstUpdated.shopping_mall_seller_id,
    baselineSellerId,
  );
  TestValidator.equals(
    "shopping_mall_order_id remains unchanged after metadata-only patch",
    firstUpdated.shopping_mall_order_id,
    baselineOrderId,
  );
  TestValidator.equals(
    "shopping_mall_order_item_id remains unchanged after metadata-only patch",
    firstUpdated.shopping_mall_order_item_id,
    baselineOrderItemId,
  );
  TestValidator.equals(
    "shopping_mall_order_payment_id remains unchanged after metadata-only patch",
    firstUpdated.shopping_mall_order_payment_id,
    baselineOrderPaymentId,
  );

  // 10. Perform a second partial update that omits metadata, updating only earning_type
  const secondUpdateBody = {
    earning_type: "order_item",
  } satisfies IShoppingMallSellerEarning.IUpdate;
  const secondUpdated: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.update(
      connection,
      {
        sellerId: sellerId,
        sellerEarningId: initialEarning.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdated);

  // Ensure earning_type updated again but metadata preserved
  TestValidator.equals(
    "earning_type updated in second patch",
    secondUpdated.earning_type,
    "order_item",
  );
  TestValidator.equals(
    "metadata preserved when omitted from update payload",
    secondUpdated.metadata,
    newMetadata,
  );

  // Ensure monetary and ownership fields are still equal to baseline
  TestValidator.equals(
    "gross_amount unchanged after second metadata-only patch",
    secondUpdated.gross_amount,
    baselineGrossAmount,
  );
  TestValidator.equals(
    "seller_discount_amount unchanged after second metadata-only patch",
    secondUpdated.seller_discount_amount,
    baselineSellerDiscountAmount,
  );
  TestValidator.equals(
    "platform_discount_amount unchanged after second metadata-only patch",
    secondUpdated.platform_discount_amount,
    baselinePlatformDiscountAmount,
  );
  TestValidator.equals(
    "commission_amount unchanged after second metadata-only patch",
    secondUpdated.commission_amount,
    baselineCommissionAmount,
  );
  TestValidator.equals(
    "other_fee_amount unchanged after second metadata-only patch",
    secondUpdated.other_fee_amount,
    baselineOtherFeeAmount,
  );
  TestValidator.equals(
    "net_earning_amount unchanged after second metadata-only patch",
    secondUpdated.net_earning_amount,
    baselineNetEarningAmount,
  );
  TestValidator.equals(
    "currency_code unchanged after second metadata-only patch",
    secondUpdated.currency_code,
    baselineCurrencyCode,
  );
  TestValidator.equals(
    "business_status unchanged after second metadata-only patch",
    secondUpdated.business_status,
    baselineBusinessStatus,
  );
  TestValidator.equals(
    "shopping_mall_seller_id unchanged after second metadata-only patch",
    secondUpdated.shopping_mall_seller_id,
    baselineSellerId,
  );
  TestValidator.equals(
    "shopping_mall_order_id unchanged after second metadata-only patch",
    secondUpdated.shopping_mall_order_id,
    baselineOrderId,
  );
  TestValidator.equals(
    "shopping_mall_order_item_id unchanged after second metadata-only patch",
    secondUpdated.shopping_mall_order_item_id,
    baselineOrderItemId,
  );
  TestValidator.equals(
    "shopping_mall_order_payment_id unchanged after second metadata-only patch",
    secondUpdated.shopping_mall_order_payment_id,
    baselineOrderPaymentId,
  );
}
