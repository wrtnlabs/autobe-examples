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
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_order_shipping_address_get_for_order_with_inline_snapshot(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
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
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Seller join (auto-authenticated)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Customer join (auto-authenticated)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 4. As admin: create country
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
  TestValidator.equals(
    "created country_code should match",
    country.country_code,
    countryCreateBody.country_code,
  );

  // 5. As admin: create region for that country
  const regionCode = "CA";
  const regionCreateBody = {
    code: regionCode,
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
  TestValidator.equals(
    "created region code should match",
    region.code,
    regionCreateBody.code,
  );

  // 6. As admin: create SKU inventory state (purchasable)
  const invStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "SKU is available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const invState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: invStateCreateBody },
    );
  typia.assert(invState);
  TestValidator.predicate(
    "inventory state should be purchasable",
    invState.is_purchasable === true,
  );

  // 7. As admin: create shipping method
  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 8. As admin: create payment method
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
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 9. As seller: create product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model X",
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

  // 10. As admin: create category
  const categoryCreateBody = {
    parent_id: null,
    slug: "test-category",
    name_en: "Test Category",
    description_en: "Category for testing",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 11. As admin: link product to category
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

  // 12. As seller: create SKU for product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 49.99,
    original_price: 59.99,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: invState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 13. As customer: create cart
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
  TestValidator.equals(
    "cart should belong to customer actor type",
    cart.actor_type,
    cartCreateBody.actor_type,
  );

  // 14. As customer: add SKU to cart
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
  TestValidator.equals(
    "cart item should reference SKU",
    cartItem.shopping_mall_sku_id,
    sku.id,
  );

  // 15. As customer: create order from cart without shipping address snapshot
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: cartItemCreateBody.quantity,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: null,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "please deliver between 9am-6pm",
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);
  TestValidator.predicate(
    "order_code should not be empty",
    order.order_code.length > 0,
  );
  TestValidator.equals(
    "order should have one item",
    order.items.length,
    orderCreateBody.items.length,
  );

  // ensure order initially has no shipping address snapshot via our path
  TestValidator.equals(
    "order created without shipping address snapshot via ICreate",
    orderCreateBody.shipping_address_snapshot,
    null,
  );

  // 16. As customer: create inline shipping address snapshot for order
  const inlineRecipientName = "John Doe";
  const inlineLine1 = "123 Market St";
  const inlineLine2 = "Apt 456";
  const inlineCity = "San Francisco";
  const inlinePostalCode = "94103";
  const inlineCountryCode = country.country_code as string &
    tags.MinLength<2> &
    tags.MaxLength<2>;
  const inlineRegion = region.name_en;
  const inlinePhoneNumber = RandomGenerator.mobile("+1415");

  const orderShippingAddressCreateBody = {
    recipient_name: inlineRecipientName,
    line1: inlineLine1,
    line2: inlineLine2,
    city: inlineCity,
    postal_code: inlinePostalCode,
    country_code: inlineCountryCode,
    region: inlineRegion,
    phone_number: inlinePhoneNumber,
  } satisfies IShoppingMallOrderShippingAddress.ICreate;
  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: orderShippingAddressCreateBody,
      },
    );
  typia.assert(orderShippingAddress);

  TestValidator.equals(
    "order shipping snapshot recipient_name should match inline",
    orderShippingAddress.recipient_name,
    inlineRecipientName,
  );
  TestValidator.equals(
    "order shipping snapshot line1 should match inline",
    orderShippingAddress.line1,
    inlineLine1,
  );
  TestValidator.equals(
    "order shipping snapshot line2 should match inline",
    orderShippingAddress.line2,
    inlineLine2,
  );
  TestValidator.equals(
    "order shipping snapshot city should match inline",
    orderShippingAddress.city,
    inlineCity,
  );
  TestValidator.equals(
    "order shipping snapshot postal_code should match inline",
    orderShippingAddress.postal_code,
    inlinePostalCode,
  );
  TestValidator.equals(
    "order shipping snapshot country_code should match inline",
    orderShippingAddress.country_code,
    inlineCountryCode,
  );
  TestValidator.equals(
    "order shipping snapshot region should match inline",
    orderShippingAddress.region,
    inlineRegion,
  );
  TestValidator.equals(
    "order shipping snapshot phone_number should match inline",
    orderShippingAddress.phone_number,
    inlinePhoneNumber,
  );
  TestValidator.equals(
    "order shipping snapshot order summary should match order_code",
    orderShippingAddress.order.order_code,
    order.order_code,
  );

  // 17. GET shipping address snapshot via public order endpoint
  const shippingAddress: IShoppingMallShippingAddress =
    await api.functional.shoppingMall.orders.shippingAddress.at(connection, {
      orderCode: order.order_code,
    });
  typia.assert(shippingAddress);

  // basic shape assertions
  TestValidator.predicate(
    "shipping address id should be non-empty",
    shippingAddress.id.length > 0,
  );
  TestValidator.equals(
    "shipping address should be linked to correct order id",
    shippingAddress.shopping_mall_order_id,
    order.id,
  );

  // field equality between inline snapshot and GET result
  TestValidator.equals(
    "GET shipping address recipient_name should match inline snapshot",
    shippingAddress.recipient_name,
    inlineRecipientName,
  );
  TestValidator.equals(
    "GET shipping address line1 should match inline snapshot",
    shippingAddress.line1,
    inlineLine1,
  );
  TestValidator.equals(
    "GET shipping address line2 should match inline snapshot",
    shippingAddress.line2,
    inlineLine2,
  );
  TestValidator.equals(
    "GET shipping address city should match inline snapshot",
    shippingAddress.city,
    inlineCity,
  );
  TestValidator.equals(
    "GET shipping address postal_code should match inline snapshot",
    shippingAddress.postal_code,
    inlinePostalCode,
  );
  TestValidator.equals(
    "GET shipping address country_code should match inline snapshot",
    shippingAddress.country_code,
    inlineCountryCode,
  );
  TestValidator.equals(
    "GET shipping address region should match inline snapshot",
    shippingAddress.region,
    inlineRegion,
  );
  TestValidator.equals(
    "GET shipping address phone_number should match inline snapshot",
    shippingAddress.phone_number,
    inlinePhoneNumber,
  );

  TestValidator.predicate(
    "shipping address created_at should be non-empty",
    shippingAddress.created_at.length > 0,
  );
  TestValidator.predicate(
    "shipping address updated_at should be non-empty",
    shippingAddress.updated_at.length > 0,
  );
}
