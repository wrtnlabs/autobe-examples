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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_order_shipping_address_create_for_multi_item_order(
  connection: api.IConnection,
) {
  // 1. Customer registration & login
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joinedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(joinedCustomer);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(loggedInCustomer);

  // 2. Admin setup (join & login)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 2-a. Country creation
  const countryCode: string =
    "U" +
    RandomGenerator.alphabets(1).toUpperCase() +
    RandomGenerator.alphabets(1).toUpperCase();

  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Testland",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 2-b. Region creation
  const regionCreateBody = {
    code: "TL-01",
    name_en: "Testland Region",
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

  // 2-c. SKU inventory state
  const skuStateCreateBody = {
    code: "purchasable",
    name: "Purchasable",
    description: "Standard purchasable inventory state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 2-d. Category creation
  const categoryCreateBody = {
    parent_id: null,
    slug: "test-category-" + RandomGenerator.alphaNumeric(6),
    name_en: "Test Category",
    description_en: "Category for multi-item shipping address test",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 2-e. Shipping method creation
  const shippingMethodCreateBody = {
    method_code: "standard-" + RandomGenerator.alphaNumeric(5),
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping for tests",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 2-f. Payment method creation
  const paymentMethodCreateBody = {
    code: "card-" + RandomGenerator.alphaNumeric(5),
    display_name: "Test Card",
    description: "Test card payment method",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: countryCode,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 3. Seller setup: join & login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(joinedSeller);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(loggedInSeller);

  // 3-a. Seller creates two products
  const product1CreateBody = {
    code: "P1-" + RandomGenerator.alphaNumeric(6),
    title: "Multi-item Test Product 1",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://img.example.com/p1.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product1: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product1CreateBody,
    });
  typia.assert(product1);

  const product2CreateBody = {
    code: "P2-" + RandomGenerator.alphaNumeric(6),
    title: "Multi-item Test Product 2",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-2",
    status: "active",
    primary_image_uri: "https://img.example.com/p2.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product2: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: product2CreateBody,
    });
  typia.assert(product2);

  // Switch back to admin to link products to category
  const reloggedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(reloggedAdmin);

  const product1CategoryLinkBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const product1CategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product1.id,
        body: product1CategoryLinkBody,
      },
    );
  typia.assert(product1CategoryLink);

  const product2CategoryLinkBody = {
    shopping_mall_category_id: category.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategory.ICreate;

  const product2CategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product2.id,
        body: product2CategoryLinkBody,
      },
    );
  typia.assert(product2CategoryLink);

  // Switch to seller again to create SKUs
  const reloggedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(reloggedSeller);

  const sku1CreateBody = {
    code: "SKU1-" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 50,
    original_price: 60,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product1.id as string & tags.Format<"uuid">,
      body: sku1CreateBody,
    });
  typia.assert(sku1);

  const sku2CreateBody = {
    code: "SKU2-" + RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 30,
    original_price: 40,
    inventory_quantity: 200 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: undefined,
    external_ids: undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product2.id as string & tags.Format<"uuid">,
      body: sku2CreateBody,
    });
  typia.assert(sku2);

  // 4. Customer cart & order creation
  const reloggedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(reloggedCustomer);

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

  const cartItem1CreateBody = {
    shopping_mall_sku_id: sku1.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItem1CreateBody,
    });
  typia.assert(cartItem1);

  const cartItem2CreateBody = {
    shopping_mall_sku_id: sku2.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItem2CreateBody,
    });
  typia.assert(cartItem2);

  // Prepare order items based on SKUs
  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: sku1.id,
      quantity: 1 as number & tags.Type<"int32">,
    },
    {
      shopping_mall_sku_id: sku2.id,
      quantity: 2 as number & tags.Type<"int32">,
    },
  ];

  const inlineShippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: "Test Customer",
      phone_number: RandomGenerator.mobile(),
      country_code: countryCode,
      postal_code: "12345",
      state_or_region: region.name_en,
      city: "Test City",
      address_line1: "123 Test Street",
      address_line2: "Apt 101",
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: orderItems,
    shipping_address_id: null,
    shipping_address_snapshot: inlineShippingAddressSnapshot,
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

  TestValidator.predicate(
    "order should have at least two items",
    () => order.items.length >= 2,
  );

  // 5. Create shipping address snapshot for the order via main endpoint
  const secondShippingAddressBody: IShoppingMallOrderShippingAddress.ICreate = {
    recipient_name: "Second Recipient",
    line1: "456 Another Street",
    line2: "Suite 202",
    city: "Another City",
    postal_code: "67890",
    country_code: countryCode as string & tags.MinLength<2> & tags.MaxLength<2>,
    region: region.name_en,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallOrderShippingAddress.ICreate;

  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: secondShippingAddressBody,
      },
    );
  typia.assert(orderShippingAddress);

  // 6. Business rule validations
  TestValidator.equals(
    "shipping address should be linked to the correct order code",
    orderShippingAddress.order.order_code,
    order.order_code,
  );

  TestValidator.equals(
    "recipient_name should match request body",
    orderShippingAddress.recipient_name,
    secondShippingAddressBody.recipient_name,
  );
  TestValidator.equals(
    "line1 should match request body",
    orderShippingAddress.line1,
    secondShippingAddressBody.line1,
  );
  TestValidator.equals(
    "city should match request body",
    orderShippingAddress.city,
    secondShippingAddressBody.city,
  );
  TestValidator.equals(
    "postal_code should match request body",
    orderShippingAddress.postal_code,
    secondShippingAddressBody.postal_code,
  );
  TestValidator.equals(
    "country_code should match request body",
    orderShippingAddress.country_code,
    secondShippingAddressBody.country_code,
  );
  TestValidator.equals(
    "region should match request body",
    orderShippingAddress.region,
    secondShippingAddressBody.region,
  );
  TestValidator.equals(
    "phone_number should match request body",
    orderShippingAddress.phone_number,
    secondShippingAddressBody.phone_number,
  );

  TestValidator.predicate(
    "order shipping address id must be non-empty",
    () => orderShippingAddress.id.length > 0,
  );
}
