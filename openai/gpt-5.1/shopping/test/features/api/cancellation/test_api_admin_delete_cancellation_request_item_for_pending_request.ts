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

export async function test_api_admin_delete_cancellation_request_item_for_pending_request(
  connection: api.IConnection,
) {
  // 1. Prepare reusable random primitives
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);

  const href = "https://example.com/join" as const;
  const referrer = "https://example.com/" as const;
  const currencyCode = "USD";

  // 2. Customer join & login
  const customerJoinBody = {
    email: customerEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAfterLogin);

  // 3. Seller join & login
  const sellerJoinBody = {
    email: sellerEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterLogin);

  // 4. Admin join & login
  const adminJoinBody = {
    email: adminEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminAfterLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 5. As admin, create master data: country, region, inventory state, shipping & payment methods, category
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryBody = {
    country_code: countryCode,
    name_en: "Testland",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionCode = RandomGenerator.alphabets(5).toUpperCase();
  const regionBody = {
    code: regionCode,
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  const inventoryStateCode = "in_stock";
  const skuInventoryStateBody = {
    code: inventoryStateCode,
    name: "In Stock",
    description: "Purchasable state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  const shippingMethodCode = "standard";
  const shippingMethodBody = {
    method_code: shippingMethodCode,
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCode = "card";
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Card",
    description: "Card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "Test Category",
    description_en: "Category for tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 6. As seller, create product and SKU
  const sellerProductTitle = RandomGenerator.paragraph({ sentences: 3 });
  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: sellerProductTitle,
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 7. Switch to customer context (login already done earlier)
  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAgain);

  // 8. Create customer shipping address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Tester",
    line1: "123 Test Street",
    line2: "Unit 1",
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressBody,
      },
    );
  typia.assert(customerAddress);

  // 9. Create cart and add item
  const cartBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: currencyCode,
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  const validationResult: IShoppingMallCartValidationResult =
    await api.functional.shoppingMall.customer.carts.validate(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
    });
  typia.assert(validationResult);

  TestValidator.predicate(
    "cart should be valid after adding SKU",
    validationResult.isValid,
  );

  // 10. Checkout preview
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

  TestValidator.predicate(
    "checkout preview should be allowed",
    preview.allowed_to_checkout,
  );

  // 11. Create order from cart
  const shippingSnapshotBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32">,
  };

  const orderCreateBody = {
    cart_id: cart.id as string & tags.Format<"uuid">,
    currency_code: currencyCode,
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshotBody,
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

  // 12. Create cancellation request header for the order
  const cancellationHeaderBody = {
    shopping_mall_order_id: order.id,
    request_code: RandomGenerator.alphaNumeric(10),
    status: "pending",
    scope_type: "partial_items",
    reason_code: "change_of_mind",
    reason_description: "Customer wants to cancel some items",
    requested_at: null,
    requested_by_actor_type: "customer",
  } satisfies IShoppingMallCancellationRequest.ICreate;
  const cancellationHeader: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.create(
      connection,
      {
        body: cancellationHeaderBody,
      },
    );
  typia.assert(cancellationHeader);

  // Use order.items (full detail) to build cancellation request items; ensure at least 1 exists
  TestValidator.predicate(
    "order should have at least one item",
    order.items.length > 0,
  );

  const targetOrderItem = order.items[0];
  typia.assert<IShoppingMallOrderItem>(targetOrderItem);

  const cancellationItemBody1 = {
    orderItemId: targetOrderItem.id,
    requestedQuantity: 1 as number & tags.Type<"int32">,
    reasonDescription: "Cancel first unit",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const cancellationItem1: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationHeader.id as string &
          tags.Format<"uuid">,
        body: cancellationItemBody1,
      },
    );
  typia.assert(cancellationItem1);

  const cancellationItemBody2 = {
    orderItemId: targetOrderItem.id,
    requestedQuantity: 1 as number & tags.Type<"int32">,
    reasonDescription: "Cancel second unit",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const cancellationItem2: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationHeader.id as string &
          tags.Format<"uuid">,
        body: cancellationItemBody2,
      },
    );
  typia.assert(cancellationItem2);

  // 13. Switch to admin context and delete one cancellation request item
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // Successful erase should complete without throwing
  await api.functional.shoppingMall.admin.cancellationRequests.items.erase(
    connection,
    {
      cancellationRequestId: cancellationHeader.id as string &
        tags.Format<"uuid">,
      cancellationRequestItemId: cancellationItem1.id as string &
        tags.Format<"uuid">,
    },
  );

  // 14. Second erase on the same id should fail
  await TestValidator.error(
    "second erase on same cancellation request item should fail",
    async () => {
      await api.functional.shoppingMall.admin.cancellationRequests.items.erase(
        connection,
        {
          cancellationRequestId: cancellationHeader.id as string &
            tags.Format<"uuid">,
          cancellationRequestItemId: cancellationItem1.id as string &
            tags.Format<"uuid">,
        },
      );
    },
  );

  // 15. Ensure parent cancellation request still accepts new items
  const cancellationItemBody3 = {
    orderItemId: targetOrderItem.id,
    requestedQuantity: 1 as number & tags.Type<"int32">,
    reasonDescription: "Cancel another unit after admin delete",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const cancellationItem3: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationHeader.id as string &
          tags.Format<"uuid">,
        body: cancellationItemBody3,
      },
    );
  typia.assert(cancellationItem3);

  TestValidator.equals(
    "new cancellation item should be attached successfully after admin delete",
    cancellationItem3.cancellationRequest.id,
    cancellationHeader.id,
  );
}
