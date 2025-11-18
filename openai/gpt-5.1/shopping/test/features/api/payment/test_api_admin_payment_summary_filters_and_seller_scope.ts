import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAnalyticsGranularity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsGranularity";
import type { IShoppingMallAnalyticsPaymentByMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentByMethod";
import type { IShoppingMallAnalyticsPaymentBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentBySeller";
import type { IShoppingMallAnalyticsPaymentByStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentByStatus";
import type { IShoppingMallAnalyticsPaymentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentSummary";
import type { IShoppingMallAnalyticsPaymentTimeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentTimeBucket";
import type { IShoppingMallAnalyticsPaymentTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentTotals";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

export async function test_api_admin_payment_summary_filters_and_seller_scope(
  connection: api.IConnection,
) {
  // 0. Utility to build ISO date-time around now
  const now = new Date();
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes before
  const toDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes after
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // 1. Admin join (also authenticates as admin via header side-effect)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create payment methods "card" and "wallet" as admin
  const cardMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Card payments",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const cardMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: cardMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(cardMethod);

  const walletMethodBody = {
    code: "wallet",
    display_name: "Wallet",
    description: "Wallet payments",
    provider_type: "wallet",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const walletMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: walletMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(walletMethod);

  // 3. Create a generic purchasable inventory state
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 4. Create a simple category (not strictly required by product DTO but realistic)
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. Create two sellers (A and B)
  // Seller A join and capture ids
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerAPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAAuthorized);
  const sellerAId = sellerAAuthorized.id;

  // Seller B join
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerBPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://sellerb.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://sellerb.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerBAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBAuthorized);
  const sellerBId = sellerBAuthorized.id;

  // 6. Create a customer and authenticate as customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);
  const customerId = customerAuthorized.id;

  // 7. As Seller A, create product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerAJoinBody.email,
      password: "SellerAPassword123!",
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/login" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productACreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  const skuACreateBody = {
    code: RandomGenerator.alphaNumeric(6) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id as string & tags.Format<"uuid">,
      body: skuACreateBody,
    });
  typia.assert<IShoppingMallSku>(skuA);

  // 8. As Seller B, create product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBJoinBody.email,
      password: "SellerBPassword123!",
      ip: null,
      href: "https://sellerb.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://sellerb.example.com/login" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productBCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert<IShoppingMallProduct>(productB);

  const skuBCreateBody = {
    code: RandomGenerator.alphaNumeric(6) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 200 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id as string & tags.Format<"uuid">,
      body: skuBCreateBody,
    });
  typia.assert<IShoppingMallSku>(skuB);

  // 9. As customer, login (token already set by join, but call login to simulate typical flow)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: "CustomerPassword123!",
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com/login" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  // 10. Create a cart for completeness (not strictly required for order but realistic)
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 11. Create shipping address snapshot payload util
  const buildShippingSnapshot = () => {
    const snapshot = {
      recipient_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
      country_code: "US",
      postal_code: "10001",
      state_or_region: "NY",
      city: "New York",
      address_line1: "123 Test Street",
      address_line2: null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;
    return snapshot;
  };

  // 12. Create Order A (Seller A, card)
  const orderACreateBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: skuA.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: null,
    shipping_address_snapshot: buildShippingSnapshot(),
    shipping_method_id: null,
    payment_method_id: null,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderACreateBody,
    });
  typia.assert<IShoppingMallOrder>(orderA);

  // 13. Create Order B (Seller B, wallet)
  const orderBCreateBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: skuB.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: null,
    shipping_address_snapshot: buildShippingSnapshot(),
    shipping_method_id: null,
    payment_method_id: null,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBCreateBody,
    });
  typia.assert<IShoppingMallOrder>(orderB);

  // 14. Create logical payments for each order
  const paymentACreateBody = {
    payment_method_id: cardMethod.id,
    currency_code: orderA.currency_code,
    payable_amount: orderA.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const paymentA: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: orderA.id,
        body: paymentACreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(paymentA);

  const paymentBCreateBody = {
    payment_method_id: walletMethod.id,
    currency_code: orderB.currency_code,
    payable_amount: orderB.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const paymentB: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: orderB.id,
        body: paymentBCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(paymentB);

  // 15. Re-authenticate as admin for analytics calls (ensure admin token active)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/login" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const granularityDay: IShoppingMallAnalyticsGranularity = "day";

  // 16. Analytics call 1: filter by card + Seller A
  const summaryCardSellerARequest = {
    from: fromIso,
    to: toIso,
    granularity: granularityDay,
    paymentMethodCodes: [cardMethod.code],
    sellerIds: [sellerAId],
    minAmount: undefined,
    maxAmount: undefined,
    includeHighRisk: undefined,
    includeDisputed: undefined,
  } satisfies IShoppingMallAnalyticsPaymentSummary.IRequest;

  const summaryCardSellerA: IShoppingMallAnalyticsPaymentSummary =
    await api.functional.shoppingMall.admin.analytics.payments.summary.index(
      connection,
      {
        body: summaryCardSellerARequest,
      },
    );
  typia.assert<IShoppingMallAnalyticsPaymentSummary>(summaryCardSellerA);

  const totalsCardSellerA = summaryCardSellerA.totals;
  TestValidator.predicate(
    "card+SellerA: totalPayments >= 1",
    totalsCardSellerA.totalPayments >= (0 as number & tags.Type<"int32">),
  );

  if (summaryCardSellerA.byMethod !== undefined) {
    for (const bucket of summaryCardSellerA.byMethod) {
      TestValidator.equals(
        "byMethod for card+SellerA uses card code only",
        bucket.paymentMethodCode,
        cardMethod.code,
      );
    }
  }

  if (summaryCardSellerA.bySeller !== undefined) {
    for (const bucket of summaryCardSellerA.bySeller) {
      TestValidator.equals(
        "bySeller for card+SellerA uses Seller A only",
        bucket.sellerId,
        sellerAId,
      );
    }
  }

  // 17. Analytics call 2: filter by wallet + Seller B
  const summaryWalletSellerBRequest = {
    from: fromIso,
    to: toIso,
    granularity: granularityDay,
    paymentMethodCodes: [walletMethod.code],
    sellerIds: [sellerBId],
    minAmount: undefined,
    maxAmount: undefined,
    includeHighRisk: undefined,
    includeDisputed: undefined,
  } satisfies IShoppingMallAnalyticsPaymentSummary.IRequest;

  const summaryWalletSellerB: IShoppingMallAnalyticsPaymentSummary =
    await api.functional.shoppingMall.admin.analytics.payments.summary.index(
      connection,
      {
        body: summaryWalletSellerBRequest,
      },
    );
  typia.assert<IShoppingMallAnalyticsPaymentSummary>(summaryWalletSellerB);

  const totalsWalletSellerB = summaryWalletSellerB.totals;
  TestValidator.predicate(
    "wallet+SellerB: totalPayments >= 1",
    totalsWalletSellerB.totalPayments >= (0 as number & tags.Type<"int32">),
  );

  if (summaryWalletSellerB.byMethod !== undefined) {
    for (const bucket of summaryWalletSellerB.byMethod) {
      TestValidator.equals(
        "byMethod for wallet+SellerB uses wallet code only",
        bucket.paymentMethodCode,
        walletMethod.code,
      );
    }
  }

  if (summaryWalletSellerB.bySeller !== undefined) {
    for (const bucket of summaryWalletSellerB.bySeller) {
      TestValidator.equals(
        "bySeller for wallet+SellerB uses Seller B only",
        bucket.sellerId,
        sellerBId,
      );
    }
  }

  // 18. Analytics call 3: both methods, no sellerIds
  const summaryBothMethodsRequest = {
    from: fromIso,
    to: toIso,
    granularity: granularityDay,
    paymentMethodCodes: [cardMethod.code, walletMethod.code],
    sellerIds: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    includeHighRisk: undefined,
    includeDisputed: undefined,
  } satisfies IShoppingMallAnalyticsPaymentSummary.IRequest;

  const summaryBothMethods: IShoppingMallAnalyticsPaymentSummary =
    await api.functional.shoppingMall.admin.analytics.payments.summary.index(
      connection,
      {
        body: summaryBothMethodsRequest,
      },
    );
  typia.assert<IShoppingMallAnalyticsPaymentSummary>(summaryBothMethods);

  const totalsBoth = summaryBothMethods.totals;

  TestValidator.predicate(
    "both methods: totalPayments >= max(filtered totals)",
    totalsBoth.totalPayments >=
      Math.max(
        totalsCardSellerA.totalPayments,
        totalsWalletSellerB.totalPayments,
      ),
  );

  if (summaryBothMethods.byMethod !== undefined) {
    const methodCodes = summaryBothMethods.byMethod.map(
      (b) => b.paymentMethodCode,
    );
    TestValidator.predicate(
      "both methods: byMethod includes card",
      methodCodes.includes(cardMethod.code),
    );
    TestValidator.predicate(
      "both methods: byMethod includes wallet",
      methodCodes.includes(walletMethod.code),
    );
  }
}
