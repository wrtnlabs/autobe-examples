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
 * Validate platform admin filtering of review reports by reason code and
 * status.
 *
 * Business goal: Ensure that the platform administrator can retrieve a
 * paginated list of product review reports for a single review and accurately
 * filter them by `reasonCode` and `status` using PATCH
 * /shoppingMall/platformAdmin/reviews/{reviewId}/reports.
 *
 * End-to-end workflow covered:
 *
 * 1. Create and authenticate a platform admin.
 * 2. Create and authenticate a customer.
 * 3. As platform admin, prepare catalog data: category tree, brand, product, and
 *    SKU so a concrete SKU exists.
 * 4. As customer, create a persistent cart, add the SKU as a cart item, and create
 *    an order so that the customer is eligible to review the product.
 * 5. As customer, create a product review for the purchased product.
 * 6. As customer, create multiple review reports for that review, with differing
 *    `reason_code` values.
 * 7. As platform admin, update at least one of the reports so its `status` differs
 *    from the others.
 * 8. As platform admin, call the reports index endpoint with various
 *    IShoppingMallProductReviewReport.IRequest filters to ensure:
 *
 *    - Filtering by `reasonCode` only works.
 *    - Filtering by combined `reasonCode` + `status` works.
 *    - Pagination metadata in IPage.IPagination is consistent with returned data.
 */
export async function test_api_platform_admin_filter_review_reports_by_reason_and_status(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and stay logged in as that admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminEmail = platformAdminAuthorized.email;
  const platformAdminPassword = platformAdminJoinBody.password;

  // 2. Register a new customer and stay logged in as that customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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

  const customerEmail = customerAuthorized.email;
  const customerPassword = customerJoinBody.password;

  // 3. Switch back to platform admin to create catalog data
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginResult: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 3-1. Create a category tree
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3-2. Create a brand
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3-3. Create a product
  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `prd-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
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

  // 3-4. Create a SKU under the product
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
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

  // 4. Switch to customer and create cart, cart item, and order
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginResult);

  // 4-1. Create customer cart
  const cartCreateBody = {
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
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 4-2. Add SKU as a cart item
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test item",
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

  // 4-3. Create an order from the cart.
  const itemsSubtotalAmount = 80;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 0;
  const taxTotalAmount = 0;
  const grandTotalAmount =
    itemsSubtotalAmount -
    discountTotalAmount +
    shippingTotalAmount +
    taxTotalAmount;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please ship ASAP",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 5. Create a product review as the customer
  const reviewCreateBody = {
    rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(review);

  // 6. Create multiple reports with different reason_code values
  const reasonCodeSpam = "spam";
  const reasonCodeOffensive = "offensive_content";

  const spamReportCreateBody = {
    reason_code: reasonCodeSpam,
    description: "Looks like spam content.",
    metadata: {},
  } satisfies IShoppingMallProductReviewReport.ICreate;

  const offensiveReportCreateBody = {
    reason_code: reasonCodeOffensive,
    description: "Contains offensive language.",
    metadata: {},
  } satisfies IShoppingMallProductReviewReport.ICreate;

  const spamReport: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.customer.reviews.reports.create(
      connection,
      {
        reviewId: review.id,
        body: spamReportCreateBody,
      },
    );
  typia.assert(spamReport);

  const offensiveReport: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.customer.reviews.reports.create(
      connection,
      {
        reviewId: review.id,
        body: offensiveReportCreateBody,
      },
    );
  typia.assert(offensiveReport);

  // 7. Switch back to platform admin and update one of the reports
  const platformAdminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const acceptedStatus = "accepted";

  const reportUpdateBody = {
    status: acceptedStatus,
    moderator_note: "Spam confirmed.",
    resolution_category: "review_removed",
  } satisfies IShoppingMallProductReviewReport.IUpdate;

  const updatedSpamReport: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.platformAdmin.reviews.reports.update(
      connection,
      {
        reviewId: review.id,
        reportId: spamReport.id,
        body: reportUpdateBody,
      },
    );
  typia.assert(updatedSpamReport);

  // 8-1. Filter by reasonCode only (spam)
  const filterByReasonOnlyBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortField: "createdAt",
    sortOrder: "asc",
    reporterType: undefined,
    reasonCode: reasonCodeSpam,
    status: undefined,
    createdFrom: null,
    createdTo: null,
  } satisfies IShoppingMallProductReviewReport.IRequest;

  const reasonOnlyPage: IPageIShoppingMallProductReviewReport.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviews.reports.index(
      connection,
      {
        reviewId: review.id,
        body: filterByReasonOnlyBody,
      },
    );
  typia.assert(reasonOnlyPage);

  const reasonOnlyPagination = reasonOnlyPage.pagination;
  const reasonOnlyData = reasonOnlyPage.data;

  TestValidator.equals(
    "reason-only filter records equals data length",
    reasonOnlyPagination.records,
    reasonOnlyData.length,
  );

  TestValidator.predicate(
    "reason-only filter pages is 1 when all results fit",
    reasonOnlyPagination.pages === 0 || reasonOnlyPagination.pages === 1,
  );

  await TestValidator.predicate(
    "reason-only filter has at least one result",
    async () => {
      return reasonOnlyData.length >= 1;
    },
  );

  for (const summary of reasonOnlyData) {
    TestValidator.equals(
      "reason-only filter - all reviewIds match",
      summary.reviewId,
      review.id,
    );
    TestValidator.equals(
      "reason-only filter - all reasonCodes match",
      summary.reasonCode,
      reasonCodeSpam,
    );
  }

  // 8-2. Filter by reasonCode + status (spam + accepted)
  const filterByReasonAndStatusBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortField: "createdAt",
    sortOrder: "asc",
    reporterType: undefined,
    reasonCode: reasonCodeSpam,
    status: acceptedStatus,
    createdFrom: null,
    createdTo: null,
  } satisfies IShoppingMallProductReviewReport.IRequest;

  const reasonAndStatusPage: IPageIShoppingMallProductReviewReport.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviews.reports.index(
      connection,
      {
        reviewId: review.id,
        body: filterByReasonAndStatusBody,
      },
    );
  typia.assert(reasonAndStatusPage);

  const reasonAndStatusPagination = reasonAndStatusPage.pagination;
  const reasonAndStatusData = reasonAndStatusPage.data;

  TestValidator.equals(
    "reason+status filter records equals data length",
    reasonAndStatusPagination.records,
    reasonAndStatusData.length,
  );

  TestValidator.predicate(
    "reason+status filter pages is 1 when all results fit",
    reasonAndStatusPagination.pages === 0 ||
      reasonAndStatusPagination.pages === 1,
  );

  await TestValidator.predicate(
    "reason+status filter has at least one result",
    async () => reasonAndStatusData.length >= 1,
  );

  for (const summary of reasonAndStatusData) {
    TestValidator.equals(
      "reason+status filter - all reviewIds match",
      summary.reviewId,
      review.id,
    );
    TestValidator.equals(
      "reason+status filter - all reasonCodes match",
      summary.reasonCode,
      reasonCodeSpam,
    );
    TestValidator.equals(
      "reason+status filter - all statuses match",
      summary.status,
      acceptedStatus,
    );
  }

  // 8-3. Ensure reason+status results are subset of reason-only results
  const reasonOnlyIds = reasonOnlyData.map((r) => r.id);
  for (const r of reasonAndStatusData) {
    TestValidator.predicate(
      "reason+status result must exist in reason-only set",
      reasonOnlyIds.includes(r.id),
    );
  }
}
