import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewModerationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewModerationEvent";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewModerationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewModerationEvent";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate platform admin review moderation events filtering by action and date
 * range.
 *
 * End-to-end flow:
 *
 * 1. Register seller and platform admin.
 * 2. As platform admin, create category tree and brand.
 * 3. As seller, create product, option type/value, SKU, and inventory item.
 * 4. Register customer, create cart, add item, create order.
 * 5. Customer creates a product review, capturing reviewId.
 * 6. As platform admin, query moderation events for that review twice:
 *
 *    - First with broad filters to obtain sample events.
 *    - Second with action_types and from/to filters derived from the sample.
 * 7. Assert that filtered results respect reviewId, action_types, and time window.
 */
export async function test_api_platform_admin_filter_review_moderation_events_by_action_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Register a platform admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 3. As platform admin, create category tree and brand
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch to seller auth (login)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Seller creates a product under own seller id using platformAdmin products.create for simplicity
  const productCode: string = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product for Moderation Events",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 6. Seller defines option type and value
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 7. Seller creates SKU
  const skuCode: string = `sku-${RandomGenerator.alphaNumeric(6)}`;

  const skuCreateBody = {
    code: skuCode,
    name: "Red Variant",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 8. Create inventory for SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 9. Register customer (join)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 10. Customer creates a cart
  const customerCartCreateBody = {
    currency_code: sku.currency,
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(cart);

  // 11. Add SKU to cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 12. Create an order from the cart
  const itemsSubtotal = sku.salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: undefined,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 13. Customer creates a product review
  const reviewCreateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product",
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  const reviewId = review.id;

  // 14. Switch back to platform admin (login)
  const platformAdminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 15. First call: broad moderation events query for this review
  const initialRequestBody: IShoppingMallProductReviewModerationEvent.IRequest =
    {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 50 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      sort_by: "createdAt",
      sort_direction: "desc",
      from: null,
      to: null,
      action_types: undefined,
      actor_ids: undefined,
      search: undefined,
    };

  const initialPage: IPageIShoppingMallProductReviewModerationEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.index(
      connection,
      {
        reviewId,
        body: initialRequestBody,
      },
    );
  typia.assert(initialPage);

  const initialEvents = initialPage.data;

  // If there are no events, at least validate pagination consistency and exit.
  if (initialEvents.length === 0 || initialPage.pagination.records === 0) {
    TestValidator.equals(
      "no moderation events implies zero records",
      initialPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "no moderation events implies no data entries",
      initialEvents.length,
      0,
    );
    return;
  }

  // 16. Derive filters from initial events
  const sampleEvents = initialEvents.slice(0, 3);

  // Determine time window covering all sample events
  const createdTimes = sampleEvents.map((e) => new Date(e.createdAt).getTime());
  const minTime = Math.min(...createdTimes);
  const maxTime = Math.max(...createdTimes);

  const fromDate = new Date(minTime);
  const toDate = new Date(maxTime);

  const from = fromDate.toISOString();
  const to = toDate.toISOString();

  // Collect unique action types from the sample events
  const actionSet = new Set<string>();
  for (const event of sampleEvents) {
    actionSet.add(event.action);
  }
  const actionTypesFilter: string[] = Array.from(actionSet);

  // 17. Second call: filtered moderation events query
  const filteredRequestBody: IShoppingMallProductReviewModerationEvent.IRequest =
    {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 50 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      sort_by: "createdAt",
      sort_direction: "desc",
      from,
      to,
      action_types: actionTypesFilter,
      actor_ids: undefined,
      search: undefined,
    };

  const filteredPage: IPageIShoppingMallProductReviewModerationEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.index(
      connection,
      {
        reviewId,
        body: filteredRequestBody,
      },
    );
  typia.assert(filteredPage);

  const filteredEvents = filteredPage.data;

  // Ensure that filtered pagination information is self-consistent
  TestValidator.predicate(
    "filtered records should be non-negative",
    filteredPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered data length must not exceed limit",
    filteredEvents.length <= filteredRequestBody.limit!,
  );

  if (filteredEvents.length === 0) {
    // It is possible that filter removed all events; in that case, just ensure records is zero.
    TestValidator.equals(
      "no filtered events implies zero records",
      filteredPage.pagination.records,
      0,
    );
    return;
  }

  // 18. Validate each event against filters
  for (const event of filteredEvents) {
    // Review id matches
    TestValidator.equals(
      "event reviewId must match target reviewId",
      event.productReviewId,
      reviewId,
    );

    // Action is in requested list
    TestValidator.predicate(
      "event action must be within requested action_types",
      actionTypesFilter.includes(event.action),
    );

    const createdAtTime = new Date(event.createdAt).getTime();
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();

    TestValidator.predicate(
      "event createdAt must be on or after from",
      createdAtTime >= fromTime,
    );
    TestValidator.predicate(
      "event createdAt must be on or before to",
      createdAtTime <= toTime,
    );
  }

  // 19. Sanity check: filtered result count should not exceed initial page records
  TestValidator.predicate(
    "filtered events should be less than or equal to initial records",
    filteredPage.pagination.records <= initialPage.pagination.records,
  );
}
