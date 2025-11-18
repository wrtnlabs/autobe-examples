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

export async function test_api_admin_payout_item_delete_before_batch_finalization(
  connection: api.IConnection,
) {
  // 1. Admin, seller, and customer registrations
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;
  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;
  const customerEmail = customerAuthorized.email;
  const customerPassword = customerJoinBody.password;

  // 2. Admin: basic configuration (country, region, shipping method, payment method, inventory state)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const countryCreateBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
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

  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Visa/MasterCard",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  const inventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // 3. Seller: product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const skuCreateBody = {
    code: "SKU-001" as string & tags.MinLength<1> & tags.MaxLength<255>,
    barcode: "1234567890123" as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 100,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. Customer: cart, address, order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://shop.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Market Street",
    line2: null,
    city: "San Francisco",
    postal_code: "94105",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  const orderCreateBody = {
    cart_id: null,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: null,
    payment_method_id: null,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );

  const orderItem = order.items[0];

  // 5. Customer: create logical order payment
  const orderPaymentCreateBody = {
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
        body: orderPaymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 6. Admin: create seller earning for this seller/order/order item/payment
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const grossAmount = 100;
  const sellerDiscountAmount = 0;
  const platformDiscountAmount = 0;
  const commissionAmount = 10;
  const otherFeeAmount = 0;
  const netEarningAmount =
    grossAmount - commissionAmount - sellerDiscountAmount - otherFeeAmount;

  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;

  const sellerEarningCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: orderItem.id,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: grossAmount,
    seller_discount_amount: sellerDiscountAmount,
    platform_discount_amount: platformDiscountAmount,
    commission_amount: commissionAmount,
    other_fee_amount: otherFeeAmount,
    net_earning_amount: netEarningAmount,
    earning_type: "order_item" as string & tags.MinLength<1>,
    business_status: "eligible" as string & tags.MinLength<1>,
    eligible_at: nowIso,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const sellerEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerId,
        body: sellerEarningCreateBody,
      },
    );
  typia.assert(sellerEarning);

  // 7. Admin: create payout batch in pre-final state
  const payoutBatchCreateBody = {
    batch_code: `BATCH-${RandomGenerator.alphaNumeric(8)}`,
    payout_period_start: nowIso,
    payout_period_end: nowIso,
    currency_code: order.currency_code,
    total_gross_amount: grossAmount,
    total_commission_amount: commissionAmount,
    total_net_payout_amount: netEarningAmount,
    status: "draft",
    external_reference: null,
    notes: null,
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;

  const payoutBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchCreateBody,
    });
  typia.assert(payoutBatch);

  // 8. Admin: create payout item referencing the earning
  const payoutItemCreateBody = {
    shopping_mall_seller_earning_id: sellerEarning.id,
    currency_code: payoutBatch.currencyCode,
    payout_amount: netEarningAmount,
    status: "pending",
  } satisfies IShoppingMallSellerPayoutItem.ICreate;

  const payoutItem: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: payoutItemCreateBody,
      },
    );
  typia.assert(payoutItem);

  // 9. Admin: list payout items and ensure the created item exists
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: undefined,
    minPayoutAmount: undefined,
    maxPayoutAmount: undefined,
    paidFrom: undefined,
    paidTo: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallSellerPayoutItem.IRequest;

  const listBefore: IPageIShoppingMallSellerPayoutItem.ISummary =
    await api.functional.shoppingMall.admin.payoutBatches.items.index(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: listRequestBody,
      },
    );
  typia.assert(listBefore);

  const existsBefore = listBefore.data.some(
    (item) => item.id === payoutItem.id,
  );
  TestValidator.predicate(
    "payout item must exist in batch before deletion",
    existsBefore,
  );

  // 10. Admin: delete payout item
  await api.functional.shoppingMall.admin.payoutBatches.items.erase(
    connection,
    {
      batchCode: payoutBatch.batchCode,
      payoutItemId: payoutItem.id,
    },
  );

  // 11. Admin: re-list payout items and verify deletion
  const listAfter: IPageIShoppingMallSellerPayoutItem.ISummary =
    await api.functional.shoppingMall.admin.payoutBatches.items.index(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: listRequestBody,
      },
    );
  typia.assert(listAfter);

  const existsAfter = listAfter.data.some((item) => item.id === payoutItem.id);
  TestValidator.predicate(
    "deleted payout item must not exist in batch after deletion",
    existsAfter === false,
  );
}
