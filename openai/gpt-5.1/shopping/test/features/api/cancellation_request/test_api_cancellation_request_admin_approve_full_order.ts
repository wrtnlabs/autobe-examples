import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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

export async function test_api_cancellation_request_admin_approve_full_order(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer bootstrap and master data setup

  // 1-1. Create admin and keep its email/password for later login (if needed)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
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

  // 1-2. Create seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 1-3. Create customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
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

  // 2. Admin master data: country, region, shipping method, payment method, category

  // Ensure we are authenticated as admin (login to simulate real-world flow)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2-1. Country
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 2-2. Region under that country
  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
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

  // 2-3. Shipping method
  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 2-4. Payment method
  const paymentMethodCreateBody = {
    code: "CARD",
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

  // 2-5. Category
  const categoryCreateBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronic devices",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3. Seller product and SKU

  // Authenticate as seller
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3-1. Product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "ACME",
    model_name: "ACME-1000",
    status: "active",
    primary_image_uri: "https://images.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3-2. Attach category to product (admin)
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

  // 3-3. Inventory state (admin)
  const inventoryStateCreateBody = {
    code: "IN_STOCK",
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

  // 3-4. SKU (seller)
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 10000,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // 4. Customer address, cart, cart item, and order

  // Authenticate as customer (login) to ensure customer context
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 4-1. Shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Customer",
    line1: "123 Test St",
    line2: null,
    city: "Seoul",
    postal_code: "12345",
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

  // 4-2. Cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 4-3. Cart item
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

  // 4-4. Order
  const shippingAddressSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: customerAddress.recipient_name,
      phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: customerAddress.postal_code,
      state_or_region: region.name_en,
      city: customerAddress.city,
      address_line1: customerAddress.line1,
      address_line2: customerAddress.line2 ?? null,
    };

  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [orderItemCreateBody],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotCreate,
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

  // 5. Customer creates a full-order cancellation request
  const cancellationRequestCreateBody = {
    shopping_mall_order_id: order.id,
    request_code: "CANCEL-" + order.order_code,
    status: "pending",
    scope_type: "full_order",
    reason_code: "customer_request",
    reason_description: "Customer requested full order cancellation",
    requested_at: null,
    requested_by_actor_type: "customer",
  } satisfies IShoppingMallCancellationRequest.ICreate;

  const originalCancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.create(
      connection,
      {
        body: cancellationRequestCreateBody,
      },
    );
  typia.assert(originalCancellationRequest);

  const originalId = originalCancellationRequest.id;
  const originalOrderId = originalCancellationRequest.shopping_mall_order_id;
  const originalStatus = originalCancellationRequest.status;
  const originalScopeType = originalCancellationRequest.scope_type;
  const originalRequestedAt = originalCancellationRequest.requested_at;
  const originalRequestedByActorType =
    originalCancellationRequest.requested_by_actor_type;
  const originalUpdatedAt = originalCancellationRequest.updated_at;

  // 6. Admin approves the cancellation request

  // Ensure admin authentication again before performing admin update
  const adminLoginForUpdate: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForUpdate);

  const decidedAt = new Date().toISOString();

  const updateBody = {
    status: "approved",
    scope_type: originalScopeType,
    reason_code: originalCancellationRequest.reason_code,
    reason_description: "Approved full-order cancellation by admin" as
      | string
      | null,
    requested_by_actor_type: originalRequestedByActorType,
    decided_at: decidedAt as string & tags.Format<"date-time">,
  } satisfies IShoppingMallCancellationRequest.IUpdate;

  const updatedCancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.admin.cancellationRequests.update(
      connection,
      {
        cancellationRequestId: originalCancellationRequest.id as string &
          tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedCancellationRequest);

  // 7. Validations on the updated cancellation request

  // Invariants: id and order id must remain unchanged
  TestValidator.equals(
    "cancellation id remains the same",
    updatedCancellationRequest.id,
    originalId,
  );
  TestValidator.equals(
    "order id remains the same",
    updatedCancellationRequest.shopping_mall_order_id,
    originalOrderId,
  );

  // Status should change from original (pending) to approved
  TestValidator.notEquals(
    "status has changed from original",
    updatedCancellationRequest.status,
    originalStatus,
  );
  TestValidator.equals(
    "status is approved",
    updatedCancellationRequest.status,
    "approved",
  );

  // Scope type remains unchanged (full_order)
  TestValidator.equals(
    "scope_type unchanged",
    updatedCancellationRequest.scope_type,
    originalScopeType,
  );

  // requested_by_actor_type unchanged
  TestValidator.equals(
    "requested_by_actor_type unchanged",
    updatedCancellationRequest.requested_by_actor_type,
    originalRequestedByActorType,
  );

  // decided_at should be non-null and different from original (which was likely null)
  TestValidator.predicate(
    "decided_at is set",
    updatedCancellationRequest.decided_at !== null &&
      updatedCancellationRequest.decided_at !== undefined,
  );

  // requested_at preserved
  TestValidator.equals(
    "requested_at preserved",
    updatedCancellationRequest.requested_at,
    originalRequestedAt,
  );

  // updated_at should be changed (or at least not before original)
  TestValidator.predicate(
    "updated_at is changed or advanced",
    updatedCancellationRequest.updated_at !== originalUpdatedAt,
  );

  // 8. Negative path (optional): customer must not be able to call admin update

  // Re-authenticate as customer
  const customerLoginForNegative: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginForNegative);

  await TestValidator.error(
    "customer cannot update admin cancellation request",
    async () => {
      await api.functional.shoppingMall.admin.cancellationRequests.update(
        connection,
        {
          cancellationRequestId: originalCancellationRequest.id as string &
            tags.Format<"uuid">,
          body: updateBody,
        },
      );
    },
  );
}
