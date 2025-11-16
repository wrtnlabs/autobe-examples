import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationReasonStatistics";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_cancellation_reason_statistics_basic_aggregation(
  connection: api.IConnection,
) {
  // 1. Register platform admin, seller, and customer, then log in as needed.
  const baseHref = "https://example.com/join" as string & tags.Format<"uri">;
  const baseReferrer = "https://example.com/" as string & tags.Format<"uri">;

  // 1-1. Platform admin join (to be allowed to create category tree and brand)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "AdminPass!123",
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 1-2. Seller join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPass!123",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 1-3. Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPass!123",
    name: RandomGenerator.name(),
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 2. As platform admin, create category tree and brand
  // (connection already holds platformAdmin token from join)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Tree",
    description: "Primary category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.alphabets(5)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "Test brand for cancellation statistics",
    logo_uri: "https://example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. As seller, create product, option type/values, SKUs, and inventory.
  // Switch to seller token by logging in.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerLogin.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product for Cancellations",
    short_description: "Short description",
    description: "Longer description for test product",
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // Option type (e.g., Size)
  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // Two option values (S, M)
  const optionValueSBody = {
    value: "S",
    display_name: "Small",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueMBody = {
    value: "M",
    display_name: "Medium",
    display_order: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValueS: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueSBody,
      },
    );
  typia.assert(optionValueS);

  const optionValueM: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueMBody,
      },
    );
  typia.assert(optionValueM);

  // Create two SKUs for the product via seller endpoint
  const sku1Body = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: "Size S",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku2Body = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: "Size M",
    listPrice: 11000,
    salePrice: 10000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: sku1Body,
    });
  typia.assert(sku1);

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: sku2Body,
    });
  typia.assert(sku2);

  // Create inventory for at least sku1 so that cart/order creation has stock.
  const inventoryBody = {
    product_sku_id: sku1.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 4. As customer, create cart, add item, and place two orders.
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartBody = {
    currency_code: "KRW",
    region_code: "KR",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku1.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test cart item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // Helper to create a simple order snapshot using the cart id; monetary fields
  // are made-up but consistent; address ids are random UUIDs.
  const makeOrderBody = (): IShoppingMallOrder.ICreate => {
    const cartId = cart.id;
    const currency = cart.currency_code;
    const subtotal = 9000;
    const discount = 0;
    const shipping = 0;
    const tax = 0;
    const total = subtotal - discount + shipping + tax;

    return {
      customer_cart_id: cartId,
      currency_code: currency,
      items_subtotal_amount: subtotal,
      discount_total_amount: discount,
      shipping_total_amount: shipping,
      tax_total_amount: tax,
      grand_total_amount: total,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: "Test order for cancellation statistics",
    } satisfies IShoppingMallOrder.ICreate;
  };

  const order1: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: makeOrderBody(),
    });
  typia.assert(order1);

  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: makeOrderBody(),
    });
  typia.assert(order2);

  // 5. For each order, create cancellation requests with different categories.
  const cancellation1Body = {
    request_reason_category: "changed_mind",
    request_reason_detail: "Customer changed their mind",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellation2Body = {
    request_reason_category: "ordered_by_mistake",
    request_reason_detail: "Customer ordered by mistake",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellation1: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order1.id,
        body: cancellation1Body,
      },
    );
  typia.assert(cancellation1);

  const cancellation2: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order2.id,
        body: cancellation2Body,
      },
    );
  typia.assert(cancellation2);

  // 6. Call statistics endpoint without relying on authentication
  const stats: IShoppingMallOrderCancellationReasonStatistics =
    await api.functional.shoppingMall.statistics.cancellationReasons.index(
      connection,
    );
  typia.assert(stats);

  // 7. Validate aggregates. We only assert lower bounds and presence to remain
  // robust to pre-existing data in the environment.

  // total_cancellation_request_count should be at least the two we just created.
  TestValidator.predicate(
    "total cancellation request count should be >= 2",
    stats.total_cancellation_request_count >= 2,
  );

  // Find reason category buckets for the two categories.
  const changedMindStats = stats.reason_categories.find(
    (rc) => rc.request_reason_category === "changed_mind",
  );
  const orderedByMistakeStats = stats.reason_categories.find(
    (rc) => rc.request_reason_category === "ordered_by_mistake",
  );

  TestValidator.predicate(
    'reason_categories should contain "changed_mind"',
    changedMindStats !== undefined,
  );
  TestValidator.predicate(
    'reason_categories should contain "ordered_by_mistake"',
    orderedByMistakeStats !== undefined,
  );

  if (changedMindStats !== undefined) {
    const customerActorCount = changedMindStats.actor_type_counts.find(
      (c) => c.actor_type === "customer",
    );
    TestValidator.predicate(
      "changed_mind actor_type_counts should have customer with count >= 1",
      customerActorCount !== undefined && customerActorCount.request_count >= 1,
    );
  }

  if (orderedByMistakeStats !== undefined) {
    const customerActorCount = orderedByMistakeStats.actor_type_counts.find(
      (c) => c.actor_type === "customer",
    );
    TestValidator.predicate(
      "ordered_by_mistake actor_type_counts should have customer with count >= 1",
      customerActorCount !== undefined && customerActorCount.request_count >= 1,
    );
  }

  // Validate actor_segments for customer
  const customerSegment = stats.actor_segments.find(
    (seg) => seg.actor_type === "customer",
  );
  TestValidator.predicate(
    'actor_segments should contain segment for actor_type "customer"',
    customerSegment !== undefined,
  );

  if (customerSegment !== undefined) {
    // At least 2 requests from customers
    TestValidator.predicate(
      "customer actor segment should have request_count >= 2",
      customerSegment.request_count >= 2,
    );

    const changedMindForActor = customerSegment.reason_category_counts.find(
      (rc) => rc.request_reason_category === "changed_mind",
    );
    const orderedByMistakeForActor =
      customerSegment.reason_category_counts.find(
        (rc) => rc.request_reason_category === "ordered_by_mistake",
      );

    TestValidator.predicate(
      'customer actor segment should include "changed_mind" category',
      changedMindForActor !== undefined &&
        changedMindForActor.request_count >= 1,
    );
    TestValidator.predicate(
      'customer actor segment should include "ordered_by_mistake" category',
      orderedByMistakeForActor !== undefined &&
        orderedByMistakeForActor.request_count >= 1,
    );
  }
}
