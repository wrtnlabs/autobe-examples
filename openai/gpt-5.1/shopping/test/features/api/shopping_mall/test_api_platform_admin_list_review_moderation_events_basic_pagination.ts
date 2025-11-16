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

export async function test_api_platform_admin_list_review_moderation_events_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Create and authenticate actors
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();

  // Platform admin join
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Platform admin login (ensure token context is correct)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // Seller join
  const sellerJoinBody = {
    email: sellerEmail,
    password: "P@ssw0rd!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Seller login to ensure seller auth context
  const sellerLoginBody = {
    email: sellerEmail,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Customer join
  const customerJoinBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Customer login (ensure customer auth context)
  const customerLoginBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 2. Catalog setup: as platform admin create brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Switch to seller again to create product and SKUs
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  // Seller creates product
  const productCode = RandomGenerator.alphaNumeric(16);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Seller defines an option type
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // Seller creates a single option value
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
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // Seller creates a SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // Seller creates inventory for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 3. Customer flow: create cart, add item, create order
  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAgain);

  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test cart item",
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

  // Create a minimal order snapshot from the cart
  const itemsSubtotal = 9000;
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
    customer_note: "Test order from e2e",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 4. Customer creates a product review
  const reviewCreateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: "Great product" as string & tags.MinLength<1> & tags.MaxLength<255>,
    body: RandomGenerator.paragraph({ sentences: 8 }) as string &
      tags.MinLength<1>,
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

  // 5. Switch back to platform admin to list moderation events
  const platformAdminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const limit = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sort_by: "createdAt",
    sort_direction: "desc" as const,
    from: null,
    to: null,
    action_types: undefined,
    actor_ids: undefined,
    search: undefined,
  } satisfies IShoppingMallProductReviewModerationEvent.IRequest;

  const page1: IPageIShoppingMallProductReviewModerationEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.index(
      connection,
      {
        reviewId: review.id,
        body: requestPage1,
      },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const events1 = page1.data;

  // Basic pagination assertions
  TestValidator.predicate(
    "first page current index should be 0",
    pagination1.current === 0,
  );
  TestValidator.predicate("limit should be positive", pagination1.limit > 0);
  TestValidator.predicate(
    "records should be >= data length",
    pagination1.records >= events1.length,
  );
  TestValidator.predicate("pages should be >= 0", pagination1.pages >= 0);

  if (pagination1.records === 0) {
    TestValidator.equals("no records implies empty data", events1.length, 0);
    TestValidator.equals("no records implies pages is 0", pagination1.pages, 0);
  }

  // All events must match reviewId
  for (const ev of events1) {
    TestValidator.equals(
      "event productReviewId should match review.id",
      ev.productReviewId,
      review.id,
    );
  }

  // Events should be sorted by createdAt desc
  for (let i = 1; i < events1.length; i++) {
    const prev = events1[i - 1];
    const curr = events1[i];
    TestValidator.predicate(
      "events page1 sorted by createdAt desc",
      prev.createdAt >= curr.createdAt,
    );
  }

  // 7. Cross-page navigation and non-overlap when enough records
  if (pagination1.records > pagination1.limit) {
    const requestPage2 = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit,
      sort_by: "createdAt",
      sort_direction: "desc" as const,
      from: null,
      to: null,
      action_types: undefined,
      actor_ids: undefined,
      search: undefined,
    } satisfies IShoppingMallProductReviewModerationEvent.IRequest;

    const page2: IPageIShoppingMallProductReviewModerationEvent.ISummary =
      await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.index(
        connection,
        {
          reviewId: review.id,
          body: requestPage2,
        },
      );
    typia.assert(page2);

    const pagination2 = page2.pagination;
    const events2 = page2.data;

    TestValidator.equals(
      "second page current index should be 1",
      pagination2.current,
      1,
    );

    for (const ev of events2) {
      TestValidator.equals(
        "page2 event productReviewId should match review.id",
        ev.productReviewId,
        review.id,
      );
    }

    for (let i = 1; i < events2.length; i++) {
      const prev = events2[i - 1];
      const curr = events2[i];
      TestValidator.predicate(
        "events page2 sorted by createdAt desc",
        prev.createdAt >= curr.createdAt,
      );
    }

    // Non-overlap of ids between page1 and page2
    const ids1 = new Set(events1.map((ev) => ev.id));
    const overlapping = events2.some((ev) => ids1.has(ev.id));
    TestValidator.predicate(
      "page1 and page2 event sets should not overlap",
      overlapping === false,
    );
  }

  // 8. Request a page beyond the last page and expect empty data
  const pageBeyond = pagination1.pages + 1; // 1-based request page
  if (pageBeyond >= 1) {
    const requestBeyond = {
      page: pageBeyond as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit,
      sort_by: "createdAt",
      sort_direction: "desc" as const,
      from: null,
      to: null,
      action_types: undefined,
      actor_ids: undefined,
      search: undefined,
    } satisfies IShoppingMallProductReviewModerationEvent.IRequest;

    const beyond: IPageIShoppingMallProductReviewModerationEvent.ISummary =
      await api.functional.shoppingMall.platformAdmin.reviews.moderationEvents.index(
        connection,
        {
          reviewId: review.id,
          body: requestBeyond,
        },
      );
    typia.assert(beyond);

    TestValidator.equals(
      "page beyond last should have empty data",
      beyond.data.length,
      0,
    );
    TestValidator.equals(
      "records count should stay the same",
      beyond.pagination.records,
      pagination1.records,
    );
    TestValidator.equals(
      "limit should stay the same",
      beyond.pagination.limit,
      pagination1.limit,
    );
    TestValidator.equals(
      "pages count should stay the same",
      beyond.pagination.pages,
      pagination1.pages,
    );
  }
}
