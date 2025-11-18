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
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_payout_batch_status_update(
  connection: api.IConnection,
) {
  // 1. Admin join (creates admin and sets Authorization header)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> =
    "Adm1nPassw0rd!" as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
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

  // 2. Seller join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> =
    "Sell3rPassw0rd!" as string & tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
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

  // 3. Customer join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string & tags.Format<"password"> =
    "Cust0merPassw0rd!" as string & tags.Format<"password">;

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Admin base configuration (country, region, category, inventory state, shipping, payment)
  // Ensure admin context via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/login-page" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4.a Country
  const countryCode = "US";
  const countryCreateBody = {
    country_code: countryCode,
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

  // 4.b Region
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
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4.c Category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Electronics",
    description_en: "Electronics category for tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4.d Inventory state
  const inventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
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

  // 4.e Shipping method
  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping for tests",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 4.f Payment method
  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Test card payment method",
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

  // 5. Seller product and SKU
  // Switch to seller context via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/login-page" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Associate product with category (admin)
  const adminLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin2);

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
  typia.assert(productCategory);

  // Back to seller for SKU
  const sellerLogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin2);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer order flow
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/login-page" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // Cart
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

  // Customer address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test Street",
    line2: null,
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLogin.id,
        body: addressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // Cart item
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  // Order
  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreateBody],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // Ensure we have at least one order item
  const firstOrderItem: IShoppingMallOrderItem | undefined = order.items[0];
  TestValidator.predicate(
    "order has at least one item",
    firstOrderItem !== undefined,
  );
  const orderItem: IShoppingMallOrderItem =
    typia.assert<IShoppingMallOrderItem>(firstOrderItem!);

  // Payment
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

  // 8. Seller earning (admin)
  const adminLogin3: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin3);

  const grossAmount: number = orderItem.line_total;
  const commissionAmount: number = grossAmount * 0.1;
  const netEarningAmount: number = grossAmount - commissionAmount;

  const earningCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: orderItem.id,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: grossAmount,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: commissionAmount,
    other_fee_amount: 0,
    net_earning_amount: netEarningAmount,
    earning_type: "order_item" as string & tags.MinLength<1>,
    business_status: "eligible" as string & tags.MinLength<1>,
    eligible_at: order.created_at,
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
  typia.assert(sellerEarning);

  // 9. Payout batch creation
  const payoutBatchCreateBody = {
    batch_code: RandomGenerator.alphaNumeric(12),
    payout_period_start: sellerEarning.created_at,
    payout_period_end: sellerEarning.created_at,
    currency_code: order.currency_code,
    total_gross_amount: grossAmount,
    total_commission_amount: commissionAmount,
    total_net_payout_amount: netEarningAmount,
    status: "draft",
    external_reference: null,
    notes: null,
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;

  const originalBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchCreateBody,
    });
  typia.assert(originalBatch);

  // 10. Payout batch update (status and notes)
  const newStatus = "processing";
  const newNotes = "Batch moved to processing by E2E test";

  const updateBody = {
    status: newStatus,
    notes: newNotes,
  } satisfies IShoppingMallSellerPayoutBatch.IUpdate;

  const updatedBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.update(connection, {
      batchCode: originalBatch.batchCode,
      body: updateBody,
    });
  typia.assert(updatedBatch);

  // 11. Assertions
  TestValidator.equals(
    "payout batch status updated",
    updatedBatch.status,
    newStatus,
  );

  TestValidator.equals(
    "payout batch notes updated",
    updatedBatch.notes,
    newNotes,
  );

  TestValidator.equals(
    "payout batch id is stable",
    updatedBatch.id,
    originalBatch.id,
  );

  TestValidator.equals(
    "payout period start unchanged",
    updatedBatch.payoutPeriodStart,
    originalBatch.payoutPeriodStart,
  );

  TestValidator.equals(
    "payout period end unchanged",
    updatedBatch.payoutPeriodEnd,
    originalBatch.payoutPeriodEnd,
  );

  TestValidator.equals(
    "currency code unchanged",
    updatedBatch.currencyCode,
    originalBatch.currencyCode,
  );

  TestValidator.equals(
    "gross total unchanged",
    updatedBatch.totalGrossAmount,
    originalBatch.totalGrossAmount,
  );

  TestValidator.equals(
    "commission total unchanged",
    updatedBatch.totalCommissionAmount,
    originalBatch.totalCommissionAmount,
  );

  TestValidator.equals(
    "net payout total unchanged",
    updatedBatch.totalNetPayoutAmount,
    originalBatch.totalNetPayoutAmount,
  );

  if (originalBatch.seller && updatedBatch.seller) {
    TestValidator.equals(
      "seller summary id unchanged",
      updatedBatch.seller.id,
      originalBatch.seller.id,
    );
  } else {
    TestValidator.equals(
      "seller summary presence unchanged",
      updatedBatch.seller === undefined,
      originalBatch.seller === undefined,
    );
  }

  // createdAt should remain the same
  TestValidator.equals(
    "createdAt unchanged",
    updatedBatch.createdAt,
    originalBatch.createdAt,
  );

  // updatedAt should be >= original updatedAt
  const originalUpdatedAt = new Date(originalBatch.updatedAt).getTime();
  const updatedUpdatedAt = new Date(updatedBatch.updatedAt).getTime();

  TestValidator.predicate(
    "updatedAt is not earlier than original",
    updatedUpdatedAt >= originalUpdatedAt,
  );
}
