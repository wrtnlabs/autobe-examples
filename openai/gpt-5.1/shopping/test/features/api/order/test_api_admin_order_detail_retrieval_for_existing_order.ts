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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_order_detail_retrieval_for_existing_order(
  connection: api.IConnection,
) {
  // 1. Multi-actor setup: customer, seller, admin
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const joinHref = "https://example.com/join" as string & tags.Format<"uri">;
  const joinReferrer = "https://example.com/landing" as string &
    tags.Format<"uri">;

  // Customer join
  const customerJoinBody = {
    email: customerEmail,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  // Seller join
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  // Admin join
  const adminJoinBody = {
    email: adminEmail,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 2. As admin, configure master data: country, region, shipping method, payment method, sku inventory state
  // (admin token is already active from join)
  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: countryCreateBody,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 3. As seller, create product and SKU
  // Switch to seller context via login to ensure correct actor
  const sellerLoginBody = {
    email: sellerEmail,
    password: "Password123!",
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // Attach category to product so taxonomy is valid (admin-only operation)
  const adminLoginForCategoryBody = {
    email: adminEmail,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoginForCategory = await api.functional.auth.admin.login(
    connection,
    {
      body: adminLoginForCategoryBody,
    },
  );
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForCategory);

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "General",
    description_en: null,
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryCreateBody,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // Switch back to seller for SKU creation
  const sellerLoginForSkuBody = {
    email: sellerEmail,
    password: "Password123!",
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoginForSku = await api.functional.auth.seller.login(connection, {
    body: sellerLoginForSkuBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginForSku);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 4. As customer, create cart and shipping address
  // Switch to customer context
  const customerLoginBody = {
    email: customerEmail,
    password: "Password123!",
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: cartCreateBody,
    },
  );
  typia.assert<IShoppingMallCart>(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 5. As customer, create order from cart
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver fast",
    platform_note: "test order",
  };

  const createdOrder = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert<IShoppingMallOrder>(createdOrder);

  const createdOrderCode = createdOrder.order_code;
  const createdCurrency = createdOrder.currency_code;
  const createdItemCount = createdOrder.item_count;
  const createdGrandTotal = createdOrder.grand_total_amount;

  // 7. Ensure admin is authenticated: perform admin login to refresh token
  const adminLoginBody = {
    email: adminEmail,
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 8. Admin retrieves order by orderCode
  const adminOrder = await api.functional.shoppingMall.admin.orders.at(
    connection,
    {
      orderCode: createdOrderCode,
    },
  );
  typia.assert<IShoppingMallOrder>(adminOrder);

  // 9. Validate core invariants
  TestValidator.equals(
    "order_code matches path parameter",
    adminOrder.order_code,
    createdOrderCode,
  );
  TestValidator.equals(
    "currency_code matches created order",
    adminOrder.currency_code,
    createdCurrency,
  );
  TestValidator.equals(
    "item_count matches created order",
    adminOrder.item_count,
    createdItemCount,
  );
  TestValidator.predicate(
    "item_count equals items.length",
    adminOrder.item_count === adminOrder.items.length,
  );
  TestValidator.predicate(
    "grand_total_amount is positive",
    adminOrder.grand_total_amount > 0,
  );
  TestValidator.equals(
    "grand_total_amount equals created order grand_total_amount",
    adminOrder.grand_total_amount,
    createdGrandTotal,
  );

  const finalSnapshots = adminOrder.priceSnapshots.filter((s) => s.is_final);
  TestValidator.predicate(
    "priceSnapshots non-empty",
    adminOrder.priceSnapshots.length > 0,
  );
  TestValidator.equals(
    "exactly one final price snapshot",
    finalSnapshots.length,
    1,
  );
  const finalSnapshot = finalSnapshots[0];
  TestValidator.equals(
    "grand_total_amount equals final snapshot grand_total_amount",
    adminOrder.grand_total_amount,
    finalSnapshot.grand_total_amount,
  );

  TestValidator.predicate(
    "statusHistories non-empty",
    adminOrder.statusHistories.length > 0,
  );
  TestValidator.predicate(
    "some statusHistory to_status equals current_status",
    adminOrder.statusHistories.some(
      (h: IShoppingMallOrderStatusHistory) =>
        h.to_status === adminOrder.current_status,
    ),
  );

  TestValidator.predicate(
    "order has customer summary and no guest user",
    adminOrder.customer !== null && adminOrder.guestUser === null,
  );

  TestValidator.predicate("items array non-empty", adminOrder.items.length > 0);
  TestValidator.equals("items length is 1", adminOrder.items.length, 1);

  const adminItem = adminOrder.items[0];
  const createdItem = createdOrder.items[0];

  TestValidator.equals(
    "item quantity matches requested quantity",
    adminItem.quantity,
    orderItemCreate.quantity,
  );
  TestValidator.equals(
    "item quantity matches created order item quantity",
    adminItem.quantity,
    createdItem.quantity,
  );
  TestValidator.equals(
    "item unit_price matches created order item unit_price",
    adminItem.unit_price,
    createdItem.unit_price,
  );
  TestValidator.equals(
    "item line_total matches created order item line_total",
    adminItem.line_total,
    createdItem.line_total,
  );

  TestValidator.predicate(
    "shipments array present",
    Array.isArray(adminOrder.shipments),
  );
  TestValidator.predicate(
    "payments array present",
    Array.isArray(adminOrder.payments),
  );
  TestValidator.predicate(
    "paymentStatusHistories array present",
    Array.isArray(adminOrder.paymentStatusHistories),
  );
  TestValidator.predicate(
    "refunds array present",
    Array.isArray(adminOrder.refunds),
  );
  TestValidator.predicate(
    "disputes array present",
    Array.isArray(adminOrder.disputes),
  );
}
