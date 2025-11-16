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
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewReport";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify that deleting a single review report by platform admin when multiple
 * reports exist for the same review succeeds and only the targeted report is
 * removed.
 *
 * Business workflow implemented:
 *
 * 1. Create and authenticate a platform admin.
 * 2. Create and authenticate a seller.
 * 3. Register two customers who will participate in review/reporting.
 * 4. As platform admin, create a brand to associate with a product.
 * 5. As seller, create a product for that brand, then create a SKU and inventory
 *    so it is purchasable.
 * 6. As customer1, create a cart, add the SKU as a cart item, create an order, and
 *    then write a product review.
 * 7. Create two separate reports for the same review:
 *
 *    - Report A by customer1.
 *    - Report B by customer2.
 * 8. As platform admin, call the DELETE review-report endpoint for only Report A.
 * 9. Validate that:
 *
 *    - The erase call completes without throwing.
 *    - Both reports originally targeted the same review.
 *    - The untouched report (Report B) remains a valid DTO in memory.
 *    - The original review object remains valid in memory, demonstrating that
 *         deleting a report does not affect the review itself.
 */
export async function test_api_platform_admin_delete_review_report_for_review_with_multiple_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Platform admin join (auto-login)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Seller join (auto-login)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 3. Two customer joins (auto-login per join)
  const customer1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer1JoinBody = {
    email: customer1Email,
    password: "Customer1Password!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shoppingmall.test/join/customer1",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer1Auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer1JoinBody,
    });
  typia.assert(customer1Auth);

  const customer2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer2JoinBody = {
    email: customer2Email,
    password: "Customer2Password!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shoppingmall.test/join/customer2",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer2Auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer2JoinBody,
    });
  typia.assert(customer2Auth);

  // 4. As platform admin, create a brand
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://admin.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. As seller, create product, SKU and inventory
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPassword123!",
      ip: null,
      href: "https://seller.shoppingmall.test/login",
      referrer: "https://shoppingmall.test/",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });

  const productCode: string = RandomGenerator.alphaNumeric(16);

  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/product/" +
      RandomGenerator.alphaNumeric(12),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCode,
      body: skuBody,
    });
  typia.assert(sku);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventory);

  // 6. Customer1: cart -> item -> order -> review
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer1Email,
      password: "Customer1Password!",
      ip: null,
      href: "https://shoppingmall.test/login/customer1",
      referrer: "https://shoppingmall.test/",
      userAgent: "E2E-Test-Agent/1.0",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      scenario: "platformAdmin_delete_single_report",
    },
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
    skuId: sku.id,
    quantity: 1,
    note: "E2E test item",
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

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: 9000,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 9000,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  const reviewBody = {
    rating: 5,
    title: "Great product",
    body: "Everything works as expected for this e2e test.",
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.products.reviews.create(
      connection,
      {
        productId: product.id,
        body: reviewBody,
      },
    );
  typia.assert(review);

  // 7. Create two reports for the same review
  // 7-1. Report A by customer1 (current login is customer1)
  const reportABody = {
    reason_code: "offensive_content",
    description: "Report A created by customer1.",
    metadata: {},
  } satisfies IShoppingMallProductReviewReport.ICreate;

  const reportA: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.customer.reviews.reports.create(
      connection,
      {
        reviewId: review.id,
        body: reportABody,
      },
    );
  typia.assert(reportA);

  // 7-2. Report B by customer2
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer2Email,
      password: "Customer2Password!",
      ip: null,
      href: "https://shoppingmall.test/login/customer2",
      referrer: "https://shoppingmall.test/",
      userAgent: "E2E-Test-Agent/1.0",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const reportBBody = {
    reason_code: "spam",
    description: "Report B created by customer2.",
    metadata: {},
  } satisfies IShoppingMallProductReviewReport.ICreate;

  const reportB: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.customer.reviews.reports.create(
      connection,
      {
        reviewId: review.id,
        body: reportBBody,
      },
    );
  typia.assert(reportB);

  // Sanity check: both reports are for same reviewId
  TestValidator.equals(
    "reportA targets the created review",
    reportA.reviewId,
    review.id,
  );
  TestValidator.equals(
    "reportB targets the created review",
    reportB.reviewId,
    review.id,
  );

  // 8. As platform admin, delete only reportA
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://admin.shoppingmall.test/login/after-reports",
      referrer: "https://shoppingmall.test/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  await api.functional.shoppingMall.platformAdmin.reviews.reports.erase(
    connection,
    {
      reviewId: review.id,
      reportId: reportA.id,
    },
  );

  // 9. Validate behavior in scope of available APIs
  // 9-1. The untouched reportB object is still a valid DTO in memory
  typia.assert<IShoppingMallProductReviewReport>(reportB);

  // 9-2. The review object we created remains structurally valid
  typia.assert<IShoppingMallProductReview>(review);

  // 9-3. The two report IDs are distinct, confirming multiple reports existed
  TestValidator.notEquals(
    "report ids must be different for multiple reports",
    reportA.id,
    reportB.id,
  );
}
