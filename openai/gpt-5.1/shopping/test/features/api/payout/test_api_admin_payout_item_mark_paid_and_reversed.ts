import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_admin_payout_item_mark_paid_and_reversed(
  connection: api.IConnection,
) {
  /**
   * Scenario: complex status transitions of a seller payout item from pending →
   * paid → reversed within a single payout batch.
   *
   * High-level steps (rewritten to match available APIs and DTOs):
   *
   * 1. Admin joins (creates admin account) so that we can perform all admin-only
   *    operations.
   * 2. Seller joins (creates seller account) – this will be the seller who owns
   *    product, SKU, earnings, and payouts.
   * 3. Customer joins – will place an order that generates a seller earning.
   * 4. Admin configures core masters needed for ordering and payment:
   *
   *    - Country and region
   *    - Category
   *    - Shipping method
   *    - Payment method
   * 5. Seller creates a product and SKU, and we configure an inventory state so
   *    the SKU is purchasable.
   * 6. Customer creates a cart and a shipping address for the configured
   *    country/region.
   * 7. Customer creates an order referencing the cart, shipping address, shipping
   *    method, payment method, and SKU line item.
   * 8. Customer creates a logical order payment for the order using the configured
   *    payment method.
   * 9. Admin creates a seller earning referencing the order and payment with a
   *    positive net_earning_amount.
   * 10. Admin creates a payout batch covering a period that includes the earning’s
   *     creation time and matching its currency.
   * 11. Admin creates a payout item in that batch referencing the earning, with
   *     initial pending status and payout_amount equal to the earning’s
   *     net_earning_amount.
   * 12. First update (mark paid): PUT
   *     /shoppingMall/admin/payoutBatches/{batchCode}/items/{payoutItemId}
   *
   *     - Body: status = "paid" (arbitrary string, but stable), paid_at = now,
   *           reversed_at = null, payout_amount unchanged.
   *     - Validate response: status updated, payout_amount unchanged, paid_at set,
   *           reversed_at null, updated_at later than or equal to created_at,
   *           and that payoutBatch and sellerEarning associations remain
   *           present.
   * 13. Second update (mark reversed): same PUT endpoint
   *
   *     - Body: status = "reversed", reversed_at = a later timestamp, paid_at left as
   *           original value (we do not change it), payout_amount unchanged.
   *     - Validate response: status == "reversed", reversed_at non-null, paid_at
   *           unchanged, associations intact.
   *
   * Note: many of the upstream operations (cart creation, etc.) are simplified
   * because we only need enough data to satisfy the type contracts and produce
   * a valid order, payment, and earning; business-side validations such as
   * “cart must contain items” are assumed to be covered elsewhere.
   */

  // 1. Admin joins (creates admin account and authenticates as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 3. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Customer!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // Helper: fixed ISO timestamp generator (string & tags.Format<"date-time">)
  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;
  const laterIso = new Date(Date.now() + 60 * 1000).toISOString() as string &
    tags.Format<"date-time">;

  // 4. Admin config: country
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
  typia.assert<IShoppingMallCountry>(country);

  // 4-2. Admin config: region under country
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
  typia.assert<IShoppingMallRegion>(region);

  // 4-3. Admin config: category
  const categoryCreateBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4-4. Admin config: shipping method
  const shippingMethodCreateBody = {
    method_code: `standard-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // 4-5. Admin config: payment method
  const paymentMethodCreateBody = {
    code: `card-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Credit Card",
    description: "Generic card payment",
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
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 5. Seller creates product & SKU (requires seller authentication)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(6)}`,
    title: "Sample Product",
    summary: "Sample product summary",
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/sample-product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Link product to category (admin)
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

  // Admin creates an inventory state so SKU can be in a purchasable state
  const inventoryStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "In stock and purchasable",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // Seller creates a SKU under the product
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 6. Customer auth, cart and shipping address creation
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
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
  typia.assert<IShoppingMallCart>(cart);

  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Customer",
    line1: "123 Market St",
    line2: null,
    city: "San Francisco",
    postal_code: "94103",
    phone_number: "+14155550123",
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 7. Customer creates order (linking cart, address snapshot, SKU line item, shipping & payment methods)
  const shippingAddressSnapshotCreateBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? "",
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotCreateBody,
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

  // 8. Customer creates order payment
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
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 9. Admin creates seller earning for the seller from this order + payment
  // Switch back to admin (login as admin again to ensure admin context)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const earningGross = order.grand_total_amount;
  const earningCommission = earningGross * 0.1;
  const earningOtherFee = 0;
  const earningSellerDiscount = 0;
  const earningPlatformDiscount = 0;
  const netEarning =
    earningGross - earningCommission - earningOtherFee - earningSellerDiscount;

  const earningCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id:
      order.items.length > 0 ? order.items[0].id : null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: earningGross,
    seller_discount_amount: earningSellerDiscount,
    platform_discount_amount: earningPlatformDiscount,
    commission_amount: earningCommission,
    other_fee_amount: earningOtherFee,
    net_earning_amount: netEarning,
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
        sellerId: sellerAuthorized.id,
        body: earningCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(sellerEarning);

  TestValidator.predicate(
    "net earning is positive",
    sellerEarning.net_earning_amount > 0,
  );

  // 10. Admin creates payout batch
  const payoutBatchCreateBody = {
    batch_code: `PB-${RandomGenerator.alphaNumeric(8)}`,
    payout_period_start: nowIso,
    payout_period_end: laterIso,
    currency_code: sellerEarning.currency_code,
    total_gross_amount: sellerEarning.gross_amount,
    total_commission_amount: sellerEarning.commission_amount,
    total_net_payout_amount: sellerEarning.net_earning_amount,
    status: "processing",
    external_reference: null,
    notes: "Test payout batch for E2E",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const payoutBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchCreateBody,
    });
  typia.assert<IShoppingMallSellerPayoutBatch>(payoutBatch);

  // 11. Admin creates payout item within batch referencing the earning
  const payoutItemCreateBody = {
    shopping_mall_seller_earning_id: sellerEarning.id,
    currency_code: sellerEarning.currency_code,
    payout_amount: sellerEarning.net_earning_amount,
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
  typia.assert<IShoppingMallSellerPayoutItem>(payoutItem);

  TestValidator.equals(
    "payout amount equals earning net_earning_amount",
    payoutItem.payout_amount,
    sellerEarning.net_earning_amount,
  );

  // 12. First update: mark payout item as paid
  const paidAt = new Date().toISOString() as string & tags.Format<"date-time">;
  const firstUpdateBody = {
    currency_code: payoutItem.currency_code,
    payout_amount: payoutItem.payout_amount,
    status: "paid",
    paid_at: paidAt,
    reversed_at: null,
  } satisfies IShoppingMallSellerPayoutItem.IUpdate;
  const paidItem: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.update(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        payoutItemId: payoutItem.id,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallSellerPayoutItem>(paidItem);

  TestValidator.equals("status updated to paid", paidItem.status, "paid");
  TestValidator.equals(
    "payout amount unchanged after paid update",
    paidItem.payout_amount,
    payoutItem.payout_amount,
  );
  TestValidator.predicate(
    "paid_at set on paid item",
    paidItem.paid_at !== null && paidItem.paid_at !== undefined,
  );
  TestValidator.equals(
    "reversed_at remains null after paid update",
    paidItem.reversed_at,
    null,
  );

  const createdAtPaid = new Date(paidItem.created_at).getTime();
  const updatedAtPaid = new Date(paidItem.updated_at).getTime();
  TestValidator.predicate(
    "updated_at later or equal to created_at after paid update",
    updatedAtPaid >= createdAtPaid,
  );

  TestValidator.predicate(
    "payoutBatch association present after paid update",
    paidItem.payoutBatch !== undefined,
  );
  TestValidator.predicate(
    "sellerEarning association present after paid update",
    paidItem.sellerEarning !== undefined,
  );

  // 13. Second update: mark payout item as reversed
  const reversedAt = new Date(
    Date.now() + 2 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const secondUpdateBody = {
    currency_code: paidItem.currency_code,
    payout_amount: paidItem.payout_amount,
    status: "reversed",
    paid_at: paidItem.paid_at,
    reversed_at: reversedAt,
  } satisfies IShoppingMallSellerPayoutItem.IUpdate;
  const reversedItem: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.update(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        payoutItemId: payoutItem.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallSellerPayoutItem>(reversedItem);

  TestValidator.equals(
    "status updated to reversed",
    reversedItem.status,
    "reversed",
  );
  TestValidator.predicate(
    "reversed_at set on reversed item",
    reversedItem.reversed_at !== null && reversedItem.reversed_at !== undefined,
  );
  TestValidator.equals(
    "paid_at preserved after reversal",
    reversedItem.paid_at,
    paidItem.paid_at,
  );
  TestValidator.equals(
    "payout amount unchanged after reversal",
    reversedItem.payout_amount,
    paidItem.payout_amount,
  );
  TestValidator.predicate(
    "payoutBatch association present after reversal",
    reversedItem.payoutBatch !== undefined,
  );
  TestValidator.predicate(
    "sellerEarning association present after reversal",
    reversedItem.sellerEarning !== undefined,
  );
}
