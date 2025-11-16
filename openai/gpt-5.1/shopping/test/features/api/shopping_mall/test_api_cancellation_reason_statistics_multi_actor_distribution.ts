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

export async function test_api_cancellation_reason_statistics_multi_actor_distribution(
  connection: api.IConnection,
) {
  // 1. Platform admin join & login (mainly to respect multi-actor scenario, even if not strictly needed for stats)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass!123",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create basic catalog structures as platform admin: category tree and brand
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: "Primary category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "Test brand for cancellation statistics",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller join & login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass!123",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 4. Seller creates a product linked to the brand
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: seller.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product for Cancellation Stats",
    short_description: "Short description",
    description: "Longer description for the test product",
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Seller creates a SKU for the product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default SKU",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. Seller creates inventory for this SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 1,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventory);

  // 7. Customer join & login
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass!123",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 8. Create a customer cart
  const cartBody = {
    // Let backend default currency/region; we only set is_active
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  // 9. Add cart item for the created SKU
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Item for order 1",
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

  // For simplicity, derive order monetary amounts from SKU salePrice
  const itemsSubtotal = sku.salePrice;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 10. Create first order
  const order1Body = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Order 1 for changed_mind cancellation",
  } satisfies IShoppingMallOrder.ICreate;
  const order1: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order1Body,
    });
  typia.assert(order1);

  // 11. Create second order (reuse cart and prices, new note)
  const order2Body = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Order 2 for stock_issue cancellation",
  } satisfies IShoppingMallOrder.ICreate;
  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order2Body,
    });
  typia.assert(order2);

  // 12. Create cancellation requests as customer for both orders
  const changedMindCategory = "changed_mind";
  const stockIssueCategory = "stock_issue";

  const cancel1Body = {
    request_reason_category: changedMindCategory,
    request_reason_detail: "Customer changed mind about the purchase",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;
  const cancellation1: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order1.id,
        body: cancel1Body,
      },
    );
  typia.assert(cancellation1);

  const cancel2Body = {
    request_reason_category: stockIssueCategory,
    request_reason_detail: "Stock issue discovered after ordering",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;
  const cancellation2: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order2.id,
        body: cancel2Body,
      },
    );
  typia.assert(cancellation2);

  const createdCounts: Record<string, number> = {
    [changedMindCategory]: 1,
    [stockIssueCategory]: 1,
  };
  const totalCreated =
    createdCounts[changedMindCategory] + createdCounts[stockIssueCategory];

  // 13. Fetch cancellation reason statistics
  const stats: IShoppingMallOrderCancellationReasonStatistics =
    await api.functional.shoppingMall.statistics.cancellationReasons.index(
      connection,
    );
  typia.assert(stats);

  // 14. Validate global total is at least what we just created
  TestValidator.predicate(
    "total_cancellation_request_count is at least totalCreated",
    stats.total_cancellation_request_count >= totalCreated,
  );

  // 15. Validate reason category aggregates
  for (const [category, expectedCount] of Object.entries(createdCounts)) {
    const reasonStat = stats.reason_categories.find(
      (r) => r.request_reason_category === category,
    );
    TestValidator.predicate(
      `reason category '${category}' exists in reason_categories`,
      !!reasonStat,
    );
    if (reasonStat) {
      TestValidator.predicate(
        `reason category '${category}' request_count is at least expected`,
        reasonStat.request_count >= expectedCount,
      );

      const customerActorCount = reasonStat.actor_type_counts.find(
        (c) => c.actor_type === "customer",
      );
      TestValidator.predicate(
        `reason category '${category}' has customer actor_type_counts entry`,
        !!customerActorCount,
      );
      if (customerActorCount) {
        TestValidator.predicate(
          `reason category '${category}' customer request_count is at least expected`,
          customerActorCount.request_count >= expectedCount,
        );
      }
    }
  }

  // 16. Validate actor segment for customer and its per-category breakdown
  const customerSegment = stats.actor_segments.find(
    (seg) => seg.actor_type === "customer",
  );
  TestValidator.predicate(
    "actor_segments contains customer actor_type segment",
    !!customerSegment,
  );

  if (customerSegment) {
    TestValidator.predicate(
      "customer actor_segment request_count is at least totalCreated",
      customerSegment.request_count >= totalCreated,
    );

    for (const [category, expectedCount] of Object.entries(createdCounts)) {
      const categoryCount = customerSegment.reason_category_counts.find(
        (c) => c.request_reason_category === category,
      );
      TestValidator.predicate(
        `customer actor_segment has reason_category_count for '${category}'`,
        !!categoryCount,
      );
      if (categoryCount) {
        TestValidator.predicate(
          `customer actor_segment reason_category_count for '${category}' is at least expected`,
          categoryCount.request_count >= expectedCount,
        );
      }
    }
  }
}
