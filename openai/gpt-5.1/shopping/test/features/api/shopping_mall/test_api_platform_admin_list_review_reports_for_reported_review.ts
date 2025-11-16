import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewReport";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewReport";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform administrator can list reports for a specific
 * product review that was reported by a real customer.
 *
 * This scenario walks through a realistic multi-actor flow:
 *
 * 1. A platform admin joins the system.
 * 2. A customer joins the system.
 * 3. The platform admin creates basic catalog data (brand, category tree, product,
 *    and SKU).
 * 4. The customer creates a cart, adds the SKU as a cart item, and places an order
 *    (using snapshot-friendly numeric values).
 * 5. The customer writes a product review.
 * 6. The customer reports that review once.
 * 7. The platform admin lists reports for that review using the reports index
 *    endpoint with pagination and optional filters.
 *
 * Assertions focus on:
 *
 * - All responses satisfying their DTO schemas via typia.assert.
 * - The admin-facing report index response containing at least the report just
 *   created by the customer.
 * - Pagination.limit reflecting the requested limit and records >= 1.
 * - Every returned summary having reviewId equal to the requested reviewId.
 */
export async function test_api_platform_admin_list_review_reports_for_reported_review(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Customer joins
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // From now, connection is authenticated as customer; later we will
  // login again as platform admin when listing reports.

  // 3. Switch to platform admin context explicitly using login to be safe
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. Platform admin creates catalog entities
  // 4-1. Brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri:
      "https://cdn.example.com/logo/" +
      RandomGenerator.alphaNumeric(8) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4-2. Category tree (not strictly required but realistic)
  const categoryTreeCreateBody = {
    code: "tree-" + RandomGenerator.alphaNumeric(8),
    name: "Main Catalog " + RandomGenerator.alphabets(4),
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

  // 4-3. Product
  // Note: We do not have a seller creation API, so we use a random UUID
  // for shopping_mall_seller_id and rely on simulator/backend behavior.
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = "prod-" + RandomGenerator.alphaNumeric(10);
  const productCreateBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product " + RandomGenerator.alphabets(6),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + productCode + "/main.png",
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

  // 4-4. SKU under the product
  const skuCreateBody = {
    code: "sku-" + RandomGenerator.alphaNumeric(8),
    name: "Default Variant",
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 5. Switch back to customer for cart/order/review/report
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/join-complete",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  // 6. Customer creates cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
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

  // 7. Customer adds item to cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "E2E purchase for review reporting test",
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

  // 8. Customer creates an order from the cart.
  // We use simple consistent snapshot amounts; the backend/simulator
  // handles deeper validation.
  const itemsSubtotal = 8000;
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
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 9. Customer writes a product review
  const reviewCreateBody = {
    rating: 5,
    title: "Great product for E2E tests",
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // 10. Customer submits a report for that review
  const reasonCode = "spam";
  const reportCreateBody = {
    reason_code: reasonCode,
    description: "This review is being reported for E2E test validation.",
    metadata: {},
  } satisfies IShoppingMallProductReviewReport.ICreate;

  const createdReport: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.customer.reviews.reports.create(
      connection,
      {
        reviewId: review.id,
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 11. Switch back to platform admin to list reports
  const adminLoginAgainBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/reports",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginAgainAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginAgainBody,
    });
  typia.assert(adminLoginAgainAuthorized);

  // 12. Platform admin lists reports for the review
  const pageRequest = 1;
  const limitRequest = 10;

  const indexRequestBody = {
    page: pageRequest,
    limit: limitRequest,
    sortField: "createdAt",
    sortOrder: "desc",
    reporterType: undefined,
    reasonCode,
    status: undefined,
    createdFrom: null,
    createdTo: null,
  } satisfies IShoppingMallProductReviewReport.IRequest;

  const pageResult: IPageIShoppingMallProductReviewReport.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviews.reports.index(
      connection,
      {
        reviewId: review.id,
        body: indexRequestBody,
      },
    );
  typia.assert(pageResult);

  // 13. Validate pagination and data content
  const pagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination.limit matches requested limit",
    pagination.limit,
    limitRequest,
  );

  TestValidator.predicate(
    "pagination.records should be at least 1",
    pagination.records >= 1,
  );

  TestValidator.predicate(
    "data array should contain at least one report",
    pageResult.data.length >= 1,
  );

  // Ensure that there is a summary matching the created report
  const matchingSummary = pageResult.data.find((summary) => {
    return (
      summary.id === createdReport.id &&
      summary.reviewId === createdReport.reviewId &&
      summary.reasonCode === createdReport.reasonCode
    );
  });

  TestValidator.predicate(
    "index result contains the created report summary",
    matchingSummary !== undefined,
  );

  // Validate that all summaries have consistent reviewId equal to path param
  for (const summary of pageResult.data) {
    TestValidator.equals(
      "each report summary has reviewId equal to the queried review.id",
      summary.reviewId,
      review.id,
    );
  }
}
