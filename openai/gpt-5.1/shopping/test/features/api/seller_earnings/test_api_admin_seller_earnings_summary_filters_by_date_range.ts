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
import type { IShoppingMallSellerEarningsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsSummary";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_seller_earnings_summary_filters_by_date_range(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in to perform configuration and analytics calls
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a seller account (join + keep summary info for later sellerId)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);
  const sellerId: string & tags.Format<"uuid"> = sellerAuth.id;

  // 3. Create a customer account who will place the orders
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://shop.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shop.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);
  const customerId: string & tags.Format<"uuid"> = customerAuth.id;

  // 4. As admin, configure basic geography: country and region
  const countryBody = {
    country_code: "KR",
    name_en: "South Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
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
        body: regionBody,
      },
    );
  typia.assert(region);

  // 5. As admin, create a shipping method and a payment method used by both orders
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Visa/Master",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 6. As seller, create a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 9,
    }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "ko-KR",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. As admin, create a category and link product to category
  const categoryBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
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

  // 8. As admin, create an inventory state used by the SKU
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

  // 9. As seller, create a SKU for the product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 10000,
    original_price: 12000,
    inventory_quantity: 100,
    low_stock_threshold: 10,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 10. As customer, create a shipping address used by both orders
  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Main St",
    line2: "Apt 101",
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerId,
        body: customerAddressBody,
      },
    );
  typia.assert(customerAddress);

  // Helper to create an order (cart -> item -> order -> payment)
  const currencyCode = "KRW";
  const createOrderWithPayment = async (
    orderAmount: number,
  ): Promise<{
    order: IShoppingMallOrder;
    payment: IShoppingMallOrderPayment;
  }> => {
    // cart
    const cartBody = {
      actor_type: "customer",
      status: "active",
      currency_code: currencyCode,
    } satisfies IShoppingMallCart.ICreate;
    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: cartBody,
      });
    typia.assert(cart);

    // cart item
    const cartItemBody = {
      shopping_mall_sku_id: sku.id,
      quantity: 1,
    } satisfies IShoppingMallCartItem.ICreate;
    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id as string & tags.Format<"uuid">,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);

    // order create with reference to saved address & methods
    const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
      recipient_name: customerAddress.recipient_name,
      phone_number:
        customerAddress.phone_number !== null &&
        customerAddress.phone_number !== undefined
          ? customerAddress.phone_number
          : RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: customerAddress.postal_code,
      state_or_region: region.name_en,
      city: customerAddress.city,
      address_line1: customerAddress.line1,
      address_line2: customerAddress.line2 ?? null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

    const orderBody = {
      cart_id: cart.id,
      currency_code: currencyCode,
      items: [
        {
          shopping_mall_sku_id: sku.id,
          quantity: 1,
        },
      ] satisfies IShoppingMallOrderItem.ICreate[],
      shipping_address_id: customerAddress.id,
      shipping_address_snapshot: null,
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

    // payment create for the order
    const paymentBody = {
      payment_method_id: paymentMethod.id,
      currency_code: currencyCode,
      payable_amount: orderAmount,
      provider_reference: null,
      provider_status_code: null,
      metadata: null,
    } satisfies IShoppingMallOrderPayment.ICreate;
    const payment: IShoppingMallOrderPayment =
      await api.functional.shoppingMall.customer.orders.payments.create(
        connection,
        {
          orderId: order.id,
          body: paymentBody,
        },
      );
    typia.assert(payment);

    // return order and payment context
    return { order, payment };
  };

  // 11. Create two orders and payments for the same seller with different amounts
  const oldOrderAmount = 15000;
  const { order: oldOrder, payment: oldPayment } =
    await createOrderWithPayment(oldOrderAmount);
  const recentOrderAmount = 25000;
  const { order: recentOrder, payment: recentPayment } =
    await createOrderWithPayment(recentOrderAmount);

  // 12. As admin, create two seller earnings for that seller: one old and one recent
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const oldEligibleAt = new Date(now.getTime() - thirtyDaysMs).toISOString();
  const recentEligibleAt = new Date(
    now.getTime() - sevenDaysMs / 2,
  ).toISOString();

  const oldEarningBody = {
    shopping_mall_order_id: oldOrder.id,
    shopping_mall_order_item_id: null,
    shopping_mall_order_payment_id: oldPayment.id,
    currency_code: currencyCode,
    gross_amount: oldOrderAmount,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 0,
    other_fee_amount: 0,
    net_earning_amount: oldOrderAmount,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: oldEligibleAt,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const oldEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerId,
        body: oldEarningBody,
      },
    );
  typia.assert(oldEarning);

  const recentEarningBody = {
    shopping_mall_order_id: recentOrder.id,
    shopping_mall_order_item_id: null,
    shopping_mall_order_payment_id: recentPayment.id,
    currency_code: currencyCode,
    gross_amount: recentOrderAmount,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 0,
    other_fee_amount: 0,
    net_earning_amount: recentOrderAmount,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: recentEligibleAt,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const recentEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerId,
        body: recentEarningBody,
      },
    );
  typia.assert(recentEarning);

  // 13. Narrow-window summary: only include recent earning
  const narrowFrom = new Date(now.getTime() - sevenDaysMs).toISOString();
  const narrowTo = now.toISOString();

  const narrowRequestBody = {
    fromDate: narrowFrom,
    toDate: narrowTo,
    businessStatuses: ["eligible"],
    sellerIds: [sellerId],
    groupBy: "seller",
    currencyCode: currencyCode,
  } satisfies IShoppingMallSellerEarningsSummary.IRequest;

  const narrowSummary: IShoppingMallSellerEarningsSummary =
    await api.functional.shoppingMall.admin.analytics.sellerEarnings.summary.index(
      connection,
      { body: narrowRequestBody },
    );
  typia.assert(narrowSummary);

  // Validate that only recent earning contributes
  TestValidator.equals(
    "narrow summary net equals recent earning",
    narrowSummary.totalNetEarnings,
    recentOrderAmount,
  );
  TestValidator.equals(
    "narrow summary gross equals recent earning",
    narrowSummary.totalGrossEarnings,
    recentOrderAmount,
  );
  TestValidator.equals(
    "narrow summary earningsRecordCount is 1",
    narrowSummary.earningsRecordCount,
    1,
  );
  TestValidator.equals(
    "narrow summary orderCount is 1",
    narrowSummary.orderCount,
    1,
  );
  TestValidator.equals(
    "narrow summary currency matches",
    narrowSummary.currency,
    currencyCode,
  );

  if (narrowSummary.bySeller && narrowSummary.bySeller.length > 0) {
    const sellerSegment = narrowSummary.bySeller.find(
      (seg) => seg.sellerId === sellerId,
    );
    if (sellerSegment) {
      TestValidator.equals(
        "narrow bySeller totalNetEarnings equals recent earning",
        sellerSegment.totalNetEarnings,
        recentOrderAmount,
      );
      TestValidator.equals(
        "narrow bySeller totalGrossEarnings equals recent earning",
        sellerSegment.totalGrossEarnings,
        recentOrderAmount,
      );
      TestValidator.equals(
        "narrow bySeller earningsRecordCount is 1",
        sellerSegment.earningsRecordCount,
        1,
      );
      TestValidator.equals(
        "narrow bySeller orderCount is 1",
        sellerSegment.orderCount,
        1,
      );
    }
  }

  // 14. Wide-window summary: include both earnings
  const wideFrom = new Date(
    now.getTime() - 40 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const wideTo = now.toISOString();

  const wideRequestBody = {
    fromDate: wideFrom,
    toDate: wideTo,
    businessStatuses: ["eligible"],
    sellerIds: [sellerId],
    groupBy: "seller",
    currencyCode: currencyCode,
  } satisfies IShoppingMallSellerEarningsSummary.IRequest;

  const wideSummary: IShoppingMallSellerEarningsSummary =
    await api.functional.shoppingMall.admin.analytics.sellerEarnings.summary.index(
      connection,
      { body: wideRequestBody },
    );
  typia.assert(wideSummary);

  const totalNet = oldOrderAmount + recentOrderAmount;

  TestValidator.equals(
    "wide summary net equals sum of both earnings",
    wideSummary.totalNetEarnings,
    totalNet,
  );
  TestValidator.equals(
    "wide summary gross equals sum of both earnings",
    wideSummary.totalGrossEarnings,
    totalNet,
  );
  TestValidator.equals(
    "wide summary earningsRecordCount is 2",
    wideSummary.earningsRecordCount,
    2,
  );
  TestValidator.equals(
    "wide summary orderCount is 2",
    wideSummary.orderCount,
    2,
  );
  TestValidator.equals(
    "wide summary currency matches",
    wideSummary.currency,
    currencyCode,
  );

  if (wideSummary.bySeller && wideSummary.bySeller.length > 0) {
    const sellerSegment = wideSummary.bySeller.find(
      (seg) => seg.sellerId === sellerId,
    );
    if (sellerSegment) {
      TestValidator.equals(
        "wide bySeller totalNetEarnings equals sum of both earnings",
        sellerSegment.totalNetEarnings,
        totalNet,
      );
      TestValidator.equals(
        "wide bySeller totalGrossEarnings equals sum of both earnings",
        sellerSegment.totalGrossEarnings,
        totalNet,
      );
      TestValidator.equals(
        "wide bySeller earningsRecordCount is 2",
        sellerSegment.earningsRecordCount,
        2,
      );
      TestValidator.equals(
        "wide bySeller orderCount is 2",
        sellerSegment.orderCount,
        2,
      );
    }
  }
}
