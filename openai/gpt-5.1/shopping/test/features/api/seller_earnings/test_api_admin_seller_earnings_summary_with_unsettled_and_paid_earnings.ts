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
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_seller_earnings_summary_with_unsettled_and_paid_earnings(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Seller join & login
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const sellerId = sellerAuthorized.id;

  // 3. Customer join & login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Customer1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 4. Admin configuration: country, region, category, shipping, payment, sku inventory state
  // (connection is already authenticated as last actor; switch back to admin)
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

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
  typia.assert(region);

  const categoryCreateBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphabets(8)}`,
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const shippingMethodCreateBody = {
    method_code: `ship-${RandomGenerator.alphabets(5)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: `pay-${RandomGenerator.alphabets(5)}`,
    display_name: "Card",
    description: "Card payment",
    provider_type: "card_processor",
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
  typia.assert(paymentMethod);

  const skuInventoryStateCreateBody = {
    code: `inv-${RandomGenerator.alphabets(5)}`,
    name: "In Stock",
    description: "Purchasable state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 5. Seller product + SKU
  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: `prod-${RandomGenerator.alphabets(5)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: null,
        model_name: null,
        status: "active",
        primary_image_uri: null,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(sellerProduct);

  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: sellerProduct.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategoryLink);

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphabets(5)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: 12000,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: sellerProduct.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer cart, items, orders, payments
  const customerCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(customerCart);

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: customerCart.id,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "06236",
    state_or_region: region.code,
    city: region.name_en,
    address_line1: "Test street 123",
    address_line2: null,
  };

  const orderRequestBase: IShoppingMallOrder.ICreate = {
    cart_id: customerCart.id,
    currency_code: "KRW",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };

  const order1: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderRequestBase,
    });
  typia.assert(order1);

  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderRequestBase,
    });
  typia.assert(order2);

  // Create a payment for order1 to have an orderPayment to reference
  const payment1: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order1.id,
        body: {
          payment_method_id: paymentMethod.id,
          currency_code: order1.currency_code,
          payable_amount: order1.grand_total_amount,
          provider_reference: null,
          provider_status_code: null,
          metadata: null,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(payment1);

  // 7. Admin: create two earnings (settled vs unsettled)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const eligibleAtSettled = yesterday.toISOString();
  const eligibleAtUnsettled = now.toISOString();

  const settledNet = 7000;
  const unsettledNet = 5000;

  const settledEarningCreate: IShoppingMallSellerEarning.ICreate = {
    shopping_mall_order_id: order1.id,
    shopping_mall_order_item_id:
      order1.items.length > 0 ? order1.items[0].id : null,
    shopping_mall_order_payment_id: payment1.id,
    currency_code: order1.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: 10000,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 3000,
    other_fee_amount: 0,
    net_earning_amount: settledNet,
    earning_type: "order_item",
    business_status: "paid_out",
    eligible_at: eligibleAtSettled,
    reversed_at: null,
    metadata: null,
  };

  const unsettledEarningCreate: IShoppingMallSellerEarning.ICreate = {
    shopping_mall_order_id: order2.id,
    shopping_mall_order_item_id:
      order2.items.length > 0 ? order2.items[0].id : null,
    shopping_mall_order_payment_id: null,
    currency_code: order2.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: 8000,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 3000,
    other_fee_amount: 0,
    net_earning_amount: unsettledNet,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: eligibleAtUnsettled,
    reversed_at: null,
    metadata: null,
  };

  const settledEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: settledEarningCreate,
      },
    );
  typia.assert(settledEarning);

  const unsettledEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: unsettledEarningCreate,
      },
    );
  typia.assert(unsettledEarning);

  // 8. Admin: create payout batch and payout item only for the settled earning
  const payoutBatchCreate: IShoppingMallSellerPayoutBatch.ICreate = {
    batch_code: `pb-${RandomGenerator.alphabets(8)}`,
    payout_period_start: eligibleAtSettled,
    payout_period_end: tomorrow.toISOString(),
    currency_code: order1.currency_code,
    total_gross_amount: settledEarning.gross_amount,
    total_commission_amount: settledEarning.commission_amount,
    total_net_payout_amount: settledEarning.net_earning_amount,
    status: "processing",
    external_reference: null,
    notes: null,
  };

  const payoutBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchCreate,
    });
  typia.assert(payoutBatch);

  const payoutItemCreate: IShoppingMallSellerPayoutItem.ICreate = {
    shopping_mall_seller_earning_id: settledEarning.id,
    currency_code: payoutBatch.currencyCode,
    payout_amount: settledEarning.net_earning_amount,
    status: "paid",
  };

  const payoutItem: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: payoutItemCreate,
      },
    );
  typia.assert(payoutItem);

  // 9. Admin analytics: summary including all statuses
  const fromDate = yesterday.toISOString();
  const toDate = tomorrow.toISOString();

  const summaryAll: IShoppingMallSellerEarningsSummary =
    await api.functional.shoppingMall.admin.analytics.sellerEarnings.summary.index(
      connection,
      {
        body: {
          fromDate,
          toDate,
          businessStatuses: undefined,
          sellerIds: [sellerId],
          groupBy: "seller",
          currencyCode: order1.currency_code,
          minNetEarningAmount: undefined,
          maxNetEarningAmount: undefined,
          cursor: undefined,
        } satisfies IShoppingMallSellerEarningsSummary.IRequest,
      },
    );
  typia.assert(summaryAll);

  const expectedTotalAll = settledNet + unsettledNet;
  TestValidator.equals(
    "totalNetEarnings should equal sum of settled and unsettled earnings",
    summaryAll.totalNetEarnings,
    expectedTotalAll,
  );

  const bySellerAll = summaryAll.bySeller ?? [];
  const sellerBucketAll = bySellerAll.find((b) => b.sellerId === sellerId);

  TestValidator.predicate(
    "bySeller should contain an entry for the test seller (all statuses)",
    sellerBucketAll !== undefined,
  );

  if (sellerBucketAll !== undefined) {
    TestValidator.equals(
      "seller bucket totalNetEarnings (all) should match expected sum",
      sellerBucketAll.totalNetEarnings,
      expectedTotalAll,
    );
    TestValidator.predicate(
      "seller bucket earningsRecordCount should be at least 2 (all)",
      sellerBucketAll.earningsRecordCount >= 2,
    );
    TestValidator.predicate(
      "seller bucket orderCount should be at least 2 (all)",
      sellerBucketAll.orderCount >= 2,
    );
  }

  // 10. Admin analytics: summary filtered to settled (paid_out) only
  const summarySettled: IShoppingMallSellerEarningsSummary =
    await api.functional.shoppingMall.admin.analytics.sellerEarnings.summary.index(
      connection,
      {
        body: {
          fromDate,
          toDate,
          businessStatuses: ["paid_out"],
          sellerIds: [sellerId],
          groupBy: "seller",
          currencyCode: order1.currency_code,
          minNetEarningAmount: undefined,
          maxNetEarningAmount: undefined,
          cursor: undefined,
        } satisfies IShoppingMallSellerEarningsSummary.IRequest,
      },
    );
  typia.assert(summarySettled);

  TestValidator.equals(
    "totalNetEarnings should equal only settled earning when filtered",
    summarySettled.totalNetEarnings,
    settledNet,
  );

  const bySellerSettled = summarySettled.bySeller ?? [];
  const sellerBucketSettled = bySellerSettled.find(
    (b) => b.sellerId === sellerId,
  );

  TestValidator.predicate(
    "bySeller should contain an entry for the test seller (settled)",
    sellerBucketSettled !== undefined,
  );

  if (sellerBucketSettled !== undefined) {
    TestValidator.equals(
      "seller bucket totalNetEarnings (settled) should equal settledNet",
      sellerBucketSettled.totalNetEarnings,
      settledNet,
    );
    TestValidator.predicate(
      "seller bucket earningsRecordCount should be at least 1 (settled)",
      sellerBucketSettled.earningsRecordCount >= 1,
    );
    TestValidator.predicate(
      "seller bucket orderCount should be at least 1 (settled)",
      sellerBucketSettled.orderCount >= 1,
    );
  }
}
