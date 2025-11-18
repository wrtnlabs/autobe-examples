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

export async function test_api_customer_review_update_moderation_and_timestamps(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in to create master data (country, region, shipping, payment, category, skuInventoryState).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 1-1. Create country and region.
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: "KR",
        name_en: "Korea, Republic of",
        phone_code: "+82",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert(country);

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: "SEOUL",
          name_en: "Seoul",
          region_type: "city",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  // 1-2. Create shipping method and payment method.
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "standard",
        display_name: "Standard Shipping",
        service_level_description: "Standard shipping method for tests",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "card",
        display_name: "Credit Card",
        description: "Card payment",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 1-3. Create category.
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: "test-category",
        name_en: "Test Category",
        description_en: "Category for review update tests",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 1-4. Seller joins and logs in.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 1-5. Seller creates a product.
  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 1-6. Attach product to category as primary.
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // 1-7. Admin creates a purchasable inventory state.
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "In stock and purchasable",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(skuInventoryState);

  // 1-8. Seller creates a SKU for the product.
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 2. Customer joins and logs in.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.shoppingmall.test/join",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.shoppingmall.test/login",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const customerId = customerLogin.id;

  // 2-1. Create customer shipping address.
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: "123 Test Street",
          line2: null,
          city: "Seoul",
          postal_code: "06236",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(customerAddress);

  // 2-2. Create a cart for the customer.
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // 2-3. Create an order from the SKU.
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
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

  // Ensure there is at least one order item.
  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );

  // 2-4. Create payment for the order.
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
  typia.assert(orderPayment);

  // 2-5. Pick one order item to review (first item).
  const firstOrderItem = order.items[0];
  typia.assertGuard<IShoppingMallOrderItem>(firstOrderItem!);
  const orderItem = firstOrderItem;

  // 2-6. Create initial review for the order item.
  const reviewCreateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Initial review title",
    body: "Initial review body",
  } satisfies IShoppingMallReview.ICreate;
  const createdReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.orderItems.reviews.create(
      connection,
      {
        orderItemId: orderItem.id,
        body: reviewCreateBody,
      },
    );
  typia.assert(createdReview);

  TestValidator.equals(
    "created review belongs to customer",
    createdReview.customer.id,
    customerId,
  );
  TestValidator.equals(
    "created review verified purchase is true",
    createdReview.verified_purchase,
    true,
  );

  // 3-1. Fetch original review via customer reviews.at
  const originalReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.customers.reviews.at(
      connection,
      {
        customerId,
        reviewId: createdReview.id,
      },
    );
  typia.assert(originalReview);

  TestValidator.equals(
    "original review id matches created",
    originalReview.id,
    createdReview.id,
  );

  const originalCreatedAt = originalReview.created_at;
  const originalUpdatedAt = originalReview.updated_at;
  const originalVisibilityStatus = originalReview.visibility_status;
  const originalModerationState = originalReview.moderation_state;
  const originalVerifiedPurchase = originalReview.verified_purchase;
  const originalProductId = originalReview.product.id;
  const originalSkuId = originalReview.sku?.id ?? null;
  const originalOrderItemId = originalReview.orderItem?.id ?? null;

  void originalVisibilityStatus;
  void originalModerationState;

  // 3-2. Prepare update payload and call update.
  const updatedRating:
    | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
    | undefined = 4 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const updatedTitle = "Updated review title";
  const updatedBody = "Updated review body";

  const reviewUpdateBody = {
    rating: updatedRating,
    title: updatedTitle,
    body: updatedBody,
  } satisfies IShoppingMallReview.IUpdate;

  const updatedReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.customers.reviews.update(
      connection,
      {
        customerId,
        reviewId: createdReview.id,
        body: reviewUpdateBody,
      },
    );
  typia.assert(updatedReview);

  // 3-3. Fetch the review again after update.
  const reloadedReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.customers.reviews.at(
      connection,
      {
        customerId,
        reviewId: createdReview.id,
      },
    );
  typia.assert(reloadedReview);

  // Assertions on id and customer stability.
  TestValidator.equals(
    "updated review id matches created",
    updatedReview.id,
    createdReview.id,
  );
  TestValidator.equals(
    "reloaded review id matches created",
    reloadedReview.id,
    createdReview.id,
  );
  TestValidator.equals(
    "updated review customer id stable",
    updatedReview.customer.id,
    customerId,
  );
  TestValidator.equals(
    "reloaded review customer id stable",
    reloadedReview.customer.id,
    customerId,
  );

  // created_at immutability.
  TestValidator.equals(
    "updated review created_at unchanged",
    updatedReview.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "reloaded review created_at unchanged",
    reloadedReview.created_at,
    originalCreatedAt,
  );

  // updated_at should change after update (at least not equal to original).
  TestValidator.notEquals(
    "updated_at changed after update",
    updatedReview.updated_at,
    originalUpdatedAt,
  );
  TestValidator.notEquals(
    "reloaded updated_at changed after update",
    reloadedReview.updated_at,
    originalUpdatedAt,
  );

  // Visibility and moderation consistency between update response and final GET.
  TestValidator.equals(
    "visibility_status stable between update and reload",
    updatedReview.visibility_status,
    reloadedReview.visibility_status,
  );
  TestValidator.equals(
    "moderation_state stable between update and reload",
    updatedReview.moderation_state,
    reloadedReview.moderation_state,
  );

  // Verified purchase remains true.
  TestValidator.equals(
    "verified_purchase remains true after update",
    updatedReview.verified_purchase,
    true,
  );
  TestValidator.equals(
    "verified_purchase remains true on reload",
    reloadedReview.verified_purchase,
    true,
  );
  TestValidator.equals(
    "verified_purchase unchanged from original",
    originalVerifiedPurchase,
    true,
  );

  // Associations remain stable.
  TestValidator.equals(
    "product id remains stable",
    updatedReview.product.id,
    originalProductId,
  );
  TestValidator.equals(
    "product id stable on reload",
    reloadedReview.product.id,
    originalProductId,
  );

  if (originalSkuId !== null) {
    TestValidator.equals(
      "sku id remains stable",
      updatedReview.sku?.id ?? null,
      originalSkuId,
    );
    TestValidator.equals(
      "sku id stable on reload",
      reloadedReview.sku?.id ?? null,
      originalSkuId,
    );
  }

  if (originalOrderItemId !== null) {
    TestValidator.equals(
      "orderItem id remains stable",
      updatedReview.orderItem?.id ?? null,
      originalOrderItemId,
    );
    TestValidator.equals(
      "orderItem id stable on reload",
      reloadedReview.orderItem?.id ?? null,
      originalOrderItemId,
    );
  }

  // Content fields reflect update payload.
  if (updatedRating !== undefined) {
    TestValidator.equals(
      "rating updated correctly in update response",
      updatedReview.rating,
      updatedRating,
    );
    TestValidator.equals(
      "rating updated correctly in reload",
      reloadedReview.rating,
      updatedRating,
    );
  }
  TestValidator.equals(
    "title updated correctly in update response",
    updatedReview.title,
    updatedTitle,
  );
  TestValidator.equals(
    "title updated correctly in reload",
    reloadedReview.title,
    updatedTitle,
  );
  TestValidator.equals(
    "body updated correctly in update response",
    updatedReview.body,
    updatedBody,
  );
  TestValidator.equals(
    "body updated correctly in reload",
    reloadedReview.body,
    updatedBody,
  );
}
