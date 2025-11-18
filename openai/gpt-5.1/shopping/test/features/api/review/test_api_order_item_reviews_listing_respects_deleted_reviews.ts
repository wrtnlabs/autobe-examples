import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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

export async function test_api_order_item_reviews_listing_respects_deleted_reviews(
  connection: api.IConnection,
) {
  // 1. Prepare unique emails and basic constants
  const timestamp = Date.now();
  const customerEmail: string & tags.Format<"email"> =
    `customer+${timestamp}@example.com` as string & tags.Format<"email">;
  const sellerEmail: string & tags.Format<"email"> =
    `seller+${timestamp}@example.com` as string & tags.Format<"email">;
  const adminEmail: string & tags.Format<"email"> =
    `admin+${timestamp}@example.com` as string & tags.Format<"email">;

  const commonHref: string & tags.Format<"uri"> =
    "https://shoppingmall.example.com/join" as string & tags.Format<"uri">;
  const commonReferrer: string & tags.Format<"uri"> =
    "https://shoppingmall.example.com/" as string & tags.Format<"uri">;

  // 2. Create admin account and login
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!" as string & tags.Format<"password">,
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);
  const adminId = adminJoin.id;
  TestValidator.predicate("admin join returns id", (adminId?.length ?? 0) > 0);

  // 3. Create seller account and login
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!" as string & tags.Format<"password">,
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // 4. Create customer account and login
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!" as string & tags.Format<"password">,
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies IShoppingMallCustomerJoin.IRequest,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);
  const customerId = customerJoin.id;

  // 5. As admin, configure master data: country, region, shipping method, payment method, sku inventory state
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!" as string & tags.Format<"password">,
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const countryCreateBody = {
    country_code: `CTRY-${timestamp}`,
    name_en: "Test Country",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    { body: countryCreateBody },
  );
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
    code: `REG-${timestamp}`,
    name_en: "Test Region",
    region_type: "state",
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
    method_code: `SHIP-${timestamp}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCreateBody = {
    code: `PAY-${timestamp}`,
    display_name: "Test Payment",
    description: "Test payment method",
    provider_type: "test_provider",
    allowed_currencies: "USD",
    allowed_countries: country.country_code,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  const skuStateCreateBody = {
    code: `STATE-${timestamp}`,
    name: "In Stock",
    description: "In stock for testing",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuStateCreateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 6. As seller, create product and SKU
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!",
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: `PROD-${timestamp}`,
    title: "Test Product",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  const skuCreateBody = {
    code: `SKU-${timestamp}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
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

  // 7. As customer, create address, cart, order, and payment
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
      ip: null,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Recipient",
    line1: "123 Test Street",
    line2: null,
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

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

  const orderCreateBody = {
    cart_id: null,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: address.id,
    shipping_address_snapshot:
      null as IShoppingMallShippingAddressSnapshot.ICreate | null,
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

  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );
  const orderItem: IShoppingMallOrderItem = order.items[0];

  const paymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const payment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(payment);

  // 8. As customer, create a review on the order item
  const reviewBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product!" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 5 }) as string &
      tags.MinLength<1>,
  } satisfies IShoppingMallReview.ICreate;
  const review =
    await api.functional.shoppingMall.customer.orderItems.reviews.create(
      connection,
      {
        orderItemId: orderItem.id,
        body: reviewBody,
      },
    );
  typia.assert<IShoppingMallReview>(review);

  // 9. Call index before deletion and ensure the review is present
  const beforePage =
    await api.functional.shoppingMall.customer.orderItems.reviews.index(
      connection,
      {
        orderItemId: orderItem.id,
      },
    );
  typia.assert<IPageIShoppingMallReview.ISummary>(beforePage);

  TestValidator.predicate(
    "before deletion, at least one review exists",
    beforePage.pagination.records >= 1 && beforePage.data.length >= 1,
  );

  const beforeIds = beforePage.data.map((r) => r.id);
  TestValidator.predicate(
    "before deletion, listing contains created review",
    beforeIds.includes(review.id),
  );

  // 10. Delete the review using customer-scoped delete endpoint
  await api.functional.shoppingMall.customer.customers.reviews.erase(
    connection,
    {
      customerId,
      reviewId: review.id,
    },
  );

  // 11. Call index after deletion
  const afterPage =
    await api.functional.shoppingMall.customer.orderItems.reviews.index(
      connection,
      {
        orderItemId: orderItem.id,
      },
    );
  typia.assert<IPageIShoppingMallReview.ISummary>(afterPage);

  const afterIds = afterPage.data.map((r) => r.id);

  // Ensure pagination metadata and data length reflect that no active reviews remain
  TestValidator.predicate(
    "after deletion, pagination records is zero",
    afterPage.pagination.records === 0,
  );
  TestValidator.predicate(
    "after deletion, data array is empty",
    afterPage.data.length === 0,
  );

  TestValidator.predicate(
    "deleted review id is not in listing",
    afterIds.includes(review.id) === false,
  );
}
