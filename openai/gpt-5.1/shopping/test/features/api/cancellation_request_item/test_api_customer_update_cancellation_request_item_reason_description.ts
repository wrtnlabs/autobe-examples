import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartCheckoutPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreview";
import type { IShoppingMallCartCheckoutPreviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewItem";
import type { IShoppingMallCartCheckoutPreviewMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewMessage";
import type { IShoppingMallCartCheckoutPreviewTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartCheckoutPreviewTotals";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCartValidationError } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationError";
import type { IShoppingMallCartValidationResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationResult";
import type { IShoppingMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidationWarning";
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

export async function test_api_customer_update_cancellation_request_item_reason_description(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin, then perform admin configuration BEFORE switching actor
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin configures country, region, sku inventory state, shipping, payment, category
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

  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping method",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard credit card payment",
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

  const categoryCreateBody = {
    parent_id: null,
    slug: "general",
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3. Register and authenticate seller, then configure product and SKU as seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: "Test Product",
    summary: "Test Product Summary",
    description: "Test Product Description",
    brand: "Test Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: "https://example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

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

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 1000,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
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

  // 4. Register and authenticate customer, then create address, cart, items, preview, and order as customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Customer Recipient",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

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

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  const validation: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
    });
  typia.assert(validation);

  const previewRequestBody = {
    shipping_method_code: shippingMethod.method_code,
    payment_method_code: paymentMethod.code,
    coupon_codes: [],
    country_code: country.country_code,
    region_code: region.code,
  } satisfies IShoppingMallCartCheckoutPreview.IRequest;
  const preview: IShoppingMallCartCheckoutPreview =
    await api.functional.shoppingMall.customer.carts.checkoutPreview.index(
      connection,
      {
        cartId: cart.id as string & tags.Format<"uuid">,
        body: previewRequestBody,
      },
    );
  typia.assert(preview);

  const orderCreateBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 2 as number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: address.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please deliver fast",
    platform_note: "Test order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 5. Customer creates cancellation request header
  const cancellationRequestCreateBody = {
    shopping_mall_order_id: order.id,
    request_code: "CR-001",
    status: "pending",
    scope_type: "partial_items",
    reason_code: "customer_change_mind",
    reason_description: "Customer wants to cancel one item",
    requested_at: null,
    requested_by_actor_type: "customer",
  } satisfies IShoppingMallCancellationRequest.ICreate;
  const cancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.create(
      connection,
      {
        body: cancellationRequestCreateBody,
      },
    );
  typia.assert(cancellationRequest);

  // 6. Customer creates cancellation request item
  const targetOrderItem: IShoppingMallOrderItem = order.items[0];
  typia.assert<IShoppingMallOrderItem>(targetOrderItem);

  const initialRequestedQuantity = 1 as number & tags.Type<"int32">;

  const cancellationItemCreateBody = {
    orderItemId: targetOrderItem.id,
    requestedQuantity: initialRequestedQuantity,
    reasonDescription: "Initial line reason",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const createdItem: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: cancellationItemCreateBody,
      },
    );
  typia.assert(createdItem);

  const originalCreatedAt = new Date(createdItem.createdAt).getTime();
  const originalUpdatedAt = new Date(createdItem.updatedAt).getTime();

  // 7. Update only reasonDescription via PUT (requestedQuantity omitted)
  const updatedReason = "Updated detailed line reason";
  const updateBody = {
    reasonDescription: updatedReason,
  } satisfies IShoppingMallCancellationRequestItem.IUpdate;

  const updatedItem: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.update(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        cancellationRequestItemId: createdItem.id as string &
          tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedItem);

  TestValidator.equals(
    "cancellation request item id remains the same",
    updatedItem.id,
    createdItem.id,
  );
  TestValidator.equals(
    "cancellation request reference remains the same",
    updatedItem.cancellationRequest.id,
    createdItem.cancellationRequest.id,
  );
  TestValidator.equals(
    "order item reference remains the same",
    updatedItem.orderItem.id,
    createdItem.orderItem.id,
  );
  TestValidator.equals(
    "requested quantity remains unchanged when omitted",
    updatedItem.requestedQuantity,
    createdItem.requestedQuantity,
  );
  TestValidator.equals(
    "reasonDescription updated to new value",
    updatedItem.reasonDescription,
    updatedReason,
  );
  TestValidator.equals(
    "createdAt remains unchanged",
    new Date(updatedItem.createdAt).getTime(),
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt is greater than original updatedAt",
    new Date(updatedItem.updatedAt).getTime() > originalUpdatedAt,
  );

  // 8. Optional second update: clear reasonDescription to null
  const clearReasonBody = {
    reasonDescription: null,
  } satisfies IShoppingMallCancellationRequestItem.IUpdate;

  const clearedItem: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.update(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        cancellationRequestItemId: createdItem.id as string &
          tags.Format<"uuid">,
        body: clearReasonBody,
      },
    );
  typia.assert(clearedItem);

  TestValidator.equals(
    "requested quantity still unchanged after clearing reason",
    clearedItem.requestedQuantity,
    initialRequestedQuantity,
  );
  TestValidator.equals(
    "reasonDescription cleared to null",
    clearedItem.reasonDescription,
    null,
  );
  TestValidator.predicate(
    "updatedAt advanced again after clearing reason",
    new Date(clearedItem.updatedAt).getTime() >=
      new Date(updatedItem.updatedAt).getTime(),
  );
}
