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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that an admin can view seller detail information in a context where
 * the seller has a recent earning created from a real order and payment.
 *
 * Business flow:
 *
 * 1. Admin self-registers and becomes authenticated.
 * 2. Admin configures master data: country, region, shipping method, payment
 *    method.
 * 3. Seller self-registers and, as seller, creates a product and a SKU with an
 *    admin-defined inventory state; admin also creates a category and links the
 *    product to it.
 * 4. Customer self-registers, creates a shipping address referencing the
 *    country/region, then creates a cart and adds one line item for the SKU.
 * 5. Customer creates an order from the cart including a shipping address
 *    snapshot, shipping method, and payment method.
 * 6. Customer creates a logical order payment for that order.
 * 7. Admin logs in again (to switch actor context back) and creates a seller
 *    earning for that seller tied to the order and payment.
 * 8. Admin fetches seller detail via GET /shoppingMall/admin/sellers/{sellerId}
 *    and verifies:
 *
 *    - Core identity (id, email) matches the authenticated seller.
 *    - Seller is not soft-deleted.
 *    - The earning’s seller summary, when present, matches the seller detail id.
 * 9. Edge: requesting a completely random sellerId results in an error, without
 *    asserting specific HTTP status codes.
 */
export async function test_api_admin_view_seller_detail_with_recent_earning_context(
  connection: api.IConnection,
) {
  // Common currency used across cart/order/payment/earning
  const orderCurrency = "USD";

  // 1. Admin joins (bootstrap admin identity)
  const adminEmail: string =
    "admin+" + RandomGenerator.alphaNumeric(8) + "@example.com";
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!", // satisfies tags.Format<"password"> contract
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);
  TestValidator.equals("admin email after join", adminAuth.email, adminEmail);

  // 2. Admin creates a country
  const countryCreateBody = {
    country_code: "US-" + RandomGenerator.alphaNumeric(4),
    name_en: "United States Test",
    phone_code: "+1",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: countryCreateBody,
    },
  );
  typia.assert<IShoppingMallCountry>(country);

  // 3. Admin creates a region under the country
  const regionCreateBody = {
    code: "CA-" + RandomGenerator.alphaNumeric(3),
    name_en: "California Test",
    region_type: "state",
    is_active: true,
    sort_order: 1,
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
  TestValidator.equals(
    "region.country.id must equal created country.id",
    region.country.id,
    country.id,
  );

  // 4. Admin creates a shipping method
  const shippingMethodCreateBody = {
    method_code: "STD-" + RandomGenerator.alphaNumeric(4),
    display_name: "Standard Shipping (Test)",
    service_level_description: "Standard test shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // 5. Admin creates a payment method
  const paymentMethodCreateBody = {
    code: "CARD-" + RandomGenerator.alphaNumeric(4),
    display_name: "Test Card",
    description: "Test card payment method",
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

  // 6. Seller joins and becomes authenticated
  const sellerEmail: string =
    "seller+" + RandomGenerator.alphaNumeric(8) + "@example.com";
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);
  TestValidator.equals(
    "seller email after join",
    sellerAuth.email,
    sellerEmail,
  );

  // 7. Seller creates a product
  const productCreateBody = {
    code: "PROD-" + RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(4),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/image-" +
      RandomGenerator.alphaNumeric(6) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 8. Admin creates a category and associates product to the category
  //    (still using the seller token for now is okay because the API enforces
  //     actor role on the backend side; however, our earlier admin join already
  //     set an admin token and we have not switched back to admin until seller
  //     join. Admin endpoints were all called before seller join.)
  const categoryCreateBody = {
    parent_id: null,
    slug: "test-cat-" + RandomGenerator.alphaNumeric(6),
    name_en: "Test Category",
    description_en: "Test category description",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  // Switch back to admin before admin-only operations
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

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

  // 9. Admin creates an inventory state, then seller creates a SKU under the product
  const skuInventoryStateCreateBody = {
    code: "IN_STOCK-" + RandomGenerator.alphaNumeric(4),
    name: "In Stock (Test)",
    description: "Test in-stock state",
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

  // Switch actor back to seller to create SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const skuCreateBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuCreateBody,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 10. Customer joins and becomes authenticated
  const customerEmail: string =
    "customer+" + RandomGenerator.alphaNumeric(8) + "@example.com";
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassw0rd!",
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);
  TestValidator.equals(
    "customer email after join",
    customerAuth.email,
    customerEmail,
  );

  // 11. Customer creates a shipping address referencing the created country/region
  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: "123 Test Street",
    line2: "Suite 100",
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 12. Customer creates a cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: orderCurrency,
  } satisfies IShoppingMallCart.ICreate;

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: cartCreateBody,
    },
  );
  typia.assert<IShoppingMallCart>(cart);
  if (cart.owner_customer !== undefined && cart.owner_customer !== null) {
    TestValidator.equals(
      "cart owner customer id should match customer",
      cart.owner_customer.id,
      customerAuth.id,
    );
  }

  // 13. Customer adds a cart item referencing the SKU
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);
  TestValidator.equals(
    "cart item sku id should equal created sku id",
    cartItem.shopping_mall_sku_id,
    sku.id,
  );

  // 14. Customer creates an order from the cart
  const shippingAddressSnapshot = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: orderCurrency,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      },
    ],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  if (order.customer !== null) {
    TestValidator.equals(
      "order customer summary id should equal customer",
      order.customer.id,
      customerAuth.id,
    );
  }

  TestValidator.predicate(
    "order should have at least one item",
    order.items.length > 0,
  );
  const orderFirstItem = order.items[0];
  TestValidator.equals(
    "order first item sku id should match created sku summary",
    orderFirstItem.sku.id,
    sku.id,
  );

  // 15. Customer creates an order payment
  const orderPaymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: orderCurrency,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const orderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);
  TestValidator.equals(
    "order payment currency should match order currency",
    orderPayment.currency_code,
    orderCurrency,
  );

  // 16. Admin logs in again (actor switching) and creates a seller earning
  const adminLoginForEarningBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.example.com/login-earning",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminForEarning = await api.functional.auth.admin.login(connection, {
    body: adminLoginForEarningBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminForEarning);

  const sellerEarningCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id:
      order.items.length > 0 ? order.items[0].id : null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: orderCurrency,
    gross_amount: order.grand_total_amount,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 0,
    other_fee_amount: 0,
    net_earning_amount: order.grand_total_amount,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: order.created_at,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const sellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerAuth.id,
        body: sellerEarningCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(sellerEarning);

  if (sellerEarning.order !== undefined) {
    TestValidator.equals(
      "seller earning order summary id should match order",
      sellerEarning.order.id,
      order.id,
    );
  }

  // 17. Admin views seller detail and validates consistency
  const sellerDetail = await api.functional.shoppingMall.admin.sellers.at(
    connection,
    {
      sellerId: sellerAuth.id as string & tags.Format<"uuid">,
    },
  );
  typia.assert<IShoppingMallSeller>(sellerDetail);

  TestValidator.equals(
    "seller detail id matches seller auth id",
    sellerDetail.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller detail email matches seller auth email",
    sellerDetail.email,
    sellerAuth.email,
  );
  TestValidator.predicate(
    "seller is not soft-deleted",
    sellerDetail.deleted_at === null || sellerDetail.deleted_at === undefined,
  );

  if (sellerEarning.seller !== undefined && sellerEarning.seller !== null) {
    TestValidator.equals(
      "seller earning seller summary id matches seller detail id",
      sellerEarning.seller.id,
      sellerDetail.id,
    );
  }

  // 18. Edge: non-existent sellerId should cause an error (no status assertion)
  const nonExistingSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "requesting non-existent seller should error",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(connection, {
        sellerId: nonExistingSellerId,
      });
    },
  );
}
