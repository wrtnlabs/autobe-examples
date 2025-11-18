import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayoutItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
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

export async function test_api_admin_payout_batch_items_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join and login to get authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Create master data: country, region, category, sku inventory state, shipping method, payment method
  const countryBody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: RandomGenerator.alphaNumeric(4).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
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

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: null,
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const skuStateBody = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: null,
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuStateBody,
      },
    );
  typia.assert(skuState);

  const shippingMethodBody = {
    method_code: "STD_" + RandomGenerator.alphaNumeric(4),
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    service_level_description: null,
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "CARD_" + RandomGenerator.alphaNumeric(4),
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    description: null,
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

  // 3. Seller join/login, product and SKU
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productBody = {
    code: "PRD_" + RandomGenerator.alphaNumeric(6),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

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

  const skuBody = {
    code: "SKU_" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 500,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Customer join/login, address, cart, order, payment
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 1 }),
    line2: null,
    city: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressBody,
      },
    );
  typia.assert(address);

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

  const shippingAddressSnapshotBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "test order",
    platform_note: "test platform note",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

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

  // 5. Admin creates three seller earnings with low/medium/high net amounts
  const lowNet = 50;
  const mediumNet = 150;
  const highNet = 300;

  const earningCreateBase = (
    net: number,
  ): IShoppingMallSellerEarning.ICreate => ({
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: order.items[0]?.id ?? null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: net,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 0,
    other_fee_amount: 0,
    net_earning_amount: net,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: new Date().toISOString(),
    reversed_at: null,
    metadata: null,
  });

  const earningLow: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerAuth.id,
        body: earningCreateBase(lowNet),
      },
    );
  typia.assert(earningLow);

  const earningMedium: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerAuth.id,
        body: earningCreateBase(mediumNet),
      },
    );
  typia.assert(earningMedium);

  const earningHigh: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerAuth.id,
        body: earningCreateBase(highNet),
      },
    );
  typia.assert(earningHigh);

  // 6. Admin creates a payout batch and three payout items
  const batchCode = "PB_" + RandomGenerator.alphaNumeric(8);
  const nowIso = new Date().toISOString();
  const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const payoutBatchBody = {
    batch_code: batchCode,
    payout_period_start: nowIso,
    payout_period_end: tomorrowIso,
    currency_code: order.currency_code,
    total_gross_amount: lowNet + mediumNet + highNet,
    total_commission_amount: 0,
    total_net_payout_amount: lowNet + mediumNet + highNet,
    status: "processing",
    external_reference: null,
    notes: null,
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const payoutBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchBody,
    });
  typia.assert(payoutBatch);

  const payoutItemLowBody = {
    shopping_mall_seller_earning_id: earningLow.id,
    currency_code: payoutBatch.currencyCode,
    payout_amount: lowNet,
    status: "pending",
  } satisfies IShoppingMallSellerPayoutItem.ICreate;
  const payoutItemLow: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: payoutItemLowBody,
      },
    );
  typia.assert(payoutItemLow);

  const payoutItemMediumBody = {
    shopping_mall_seller_earning_id: earningMedium.id,
    currency_code: payoutBatch.currencyCode,
    payout_amount: mediumNet,
    status: "pending",
  } satisfies IShoppingMallSellerPayoutItem.ICreate;
  const payoutItemMedium: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: payoutItemMediumBody,
      },
    );
  typia.assert(payoutItemMedium);

  const payoutItemHighBody = {
    shopping_mall_seller_earning_id: earningHigh.id,
    currency_code: payoutBatch.currencyCode,
    payout_amount: highNet,
    status: "pending",
  } satisfies IShoppingMallSellerPayoutItem.ICreate;
  const payoutItemHigh: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: payoutItemHighBody,
      },
    );
  typia.assert(payoutItemHigh);

  // 7. Update payout items to distinct statuses
  const updatedLow: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.update(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        payoutItemId: payoutItemLow.id,
        body: {
          currency_code: payoutItemLow.currency_code,
          payout_amount: payoutItemLow.payout_amount,
          status: "pending",
          paid_at: null,
          reversed_at: null,
        } satisfies IShoppingMallSellerPayoutItem.IUpdate,
      },
    );
  typia.assert(updatedLow);

  const updatedMedium: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.update(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        payoutItemId: payoutItemMedium.id,
        body: {
          currency_code: payoutItemMedium.currency_code,
          payout_amount: payoutItemMedium.payout_amount,
          status: "paid",
          paid_at: new Date().toISOString(),
          reversed_at: null,
        } satisfies IShoppingMallSellerPayoutItem.IUpdate,
      },
    );
  typia.assert(updatedMedium);

  const updatedHigh: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.update(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        payoutItemId: payoutItemHigh.id,
        body: {
          currency_code: payoutItemHigh.currency_code,
          payout_amount: payoutItemHigh.payout_amount,
          status: "reversed",
          paid_at: null,
          reversed_at: new Date().toISOString(),
        } satisfies IShoppingMallSellerPayoutItem.IUpdate,
      },
    );
  typia.assert(updatedHigh);

  // 8. Search with status="paid" and tight payout range to match only medium item
  const searchBodySingle = {
    page: 1 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    status: "paid",
    minPayoutAmount: 100,
    maxPayoutAmount: 200,
    paidFrom: undefined,
    paidTo: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallSellerPayoutItem.IRequest;

  const pageSingle: IPageIShoppingMallSellerPayoutItem.ISummary =
    await api.functional.shoppingMall.admin.payoutBatches.items.index(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: searchBodySingle,
      },
    );
  typia.assert(pageSingle);

  TestValidator.equals(
    "single match pagination current page",
    pageSingle.pagination.current,
    1,
  );
  TestValidator.equals(
    "single match pagination limit",
    pageSingle.pagination.limit,
    2,
  );
  TestValidator.equals(
    "single match records",
    pageSingle.pagination.records,
    1,
  );
  TestValidator.equals("single match pages", pageSingle.pagination.pages, 1);
  TestValidator.equals("single match data length", pageSingle.data.length, 1);

  const onlyItem = pageSingle.data[0];
  TestValidator.equals(
    "matched payout amount",
    onlyItem.payout_amount,
    mediumNet,
  );
  TestValidator.equals("matched status", onlyItem.status, "paid");
  TestValidator.equals(
    "matched batch code",
    onlyItem.payoutBatch.batch_code,
    payoutBatch.batchCode,
  );
  TestValidator.equals(
    "matched earning id",
    onlyItem.earning.id,
    earningMedium.id,
  );

  // 9. Search without status, wide payout range and pagination across two pages
  const searchBodyPage1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 1 as number & tags.Type<"int32">,
    status: undefined,
    minPayoutAmount: 100,
    maxPayoutAmount: 300,
    paidFrom: undefined,
    paidTo: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallSellerPayoutItem.IRequest;

  const page1: IPageIShoppingMallSellerPayoutItem.ISummary =
    await api.functional.shoppingMall.admin.payoutBatches.items.index(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: searchBodyPage1,
      },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "page1 has at least two matching records across pages",
    page1.pagination.records >= 2 && page1.pagination.pages >= 2,
  );
  TestValidator.equals("page1 size", page1.data.length, 1);

  const itemPage1 = page1.data[0];
  TestValidator.predicate(
    "page1 item payout amount within range",
    itemPage1.payout_amount >= 100 && itemPage1.payout_amount <= 300,
  );
  TestValidator.equals(
    "page1 item batch code",
    itemPage1.payoutBatch.batch_code,
    payoutBatch.batchCode,
  );

  const searchBodyPage2 = {
    ...searchBodyPage1,
    page: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallSellerPayoutItem.IRequest;

  const page2: IPageIShoppingMallSellerPayoutItem.ISummary =
    await api.functional.shoppingMall.admin.payoutBatches.items.index(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: searchBodyPage2,
      },
    );
  typia.assert(page2);

  TestValidator.equals("page2 size", page2.data.length, 1);
  const itemPage2 = page2.data[0];
  TestValidator.predicate(
    "page2 item payout amount within range",
    itemPage2.payout_amount >= 100 && itemPage2.payout_amount <= 300,
  );
  TestValidator.equals(
    "page2 item batch code",
    itemPage2.payoutBatch.batch_code,
    payoutBatch.batchCode,
  );
}
