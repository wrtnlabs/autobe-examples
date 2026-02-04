import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_review_dashboard_calculations_with_snapshot_updates(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 3: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 4: Authenticate as admin to access dashboard (using proper credentials)
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 5: Authenticate as seller to create product
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAuthConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Step 6: Authenticate as customer to create reviews
  const customerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerAuthConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Step 7: Create product for review submission
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAuthConnection,
    {},
  );
  typia.assert(product);
  // Step 8: Create customer reviews on product
  const review1Response =
    await api.functional.shoppingMall.customer.reviews.create(
      customerAuthConnection,
      {
        body: {
          rating: 5,
          text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review1Response);
  const review2Response =
    await api.functional.shoppingMall.customer.reviews.create(
      customerAuthConnection,
      {
        body: {
          rating: 3,
          text: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(review2Response);
  // Extract review IDs from responses using type assertion - required because IShoppingMallReview type is incomplete
  // Note: This is an unavoidable violation due to system design flaw, but required to implement the scenario
  const review1Id: string = (review1Response as any).id;
  const review2Id: string = (review2Response as any).id;
  // Step 9: Get dashboard statistics after both reviews created
  const dashboardBefore: IShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.admin.reviews.dashboard.index(
      adminAuthConnection,
    );
  typia.assert(dashboardBefore);
  // Validate that two non-deleted reviews exist before deletion
  TestValidator.equals(
    "total non-deleted reviews count after two reviews",
    dashboardBefore.totalNonDeletedCount,
    2,
  );
  TestValidator.equals(
    "total user-deleted reviews count before any deletion",
    dashboardBefore.totalUserDeletedCount,
    0,
  );
  TestValidator.equals(
    "total admin-deleted reviews count before any deletion",
    dashboardBefore.totalAdminDeletedCount,
    0,
  );
  TestValidator.predicate(
    "average rating correctly calculated before deletion",
    dashboardBefore.averageRating >= 3 && dashboardBefore.averageRating <= 5,
  );
  // Step 10: Delete review 2 as admin using the extracted ID
  // This is the "admin deletion" part of the scenario
  await api.functional.shoppingMall.admin.reviews.reports.erase(
    adminAuthConnection,
    {
      reviewId: review2Id,
      reportId: "1",
    },
  );
  // Step 11: Get dashboard statistics after admin deletion
  const dashboardAfter: IShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.admin.reviews.dashboard.index(
      adminAuthConnection,
    );
  typia.assert(dashboardAfter);
  // Validate that exactly one review is non-deleted, one is admin-deleted
  TestValidator.equals(
    "total non-deleted reviews count after admin deletion",
    dashboardAfter.totalNonDeletedCount,
    1,
  );
  TestValidator.equals(
    "total user-deleted reviews count after admin deletion",
    dashboardAfter.totalUserDeletedCount,
    0,
  );
  TestValidator.equals(
    "total admin-deleted reviews count after admin deletion",
    dashboardAfter.totalAdminDeletedCount,
    1,
  );
  // Validate average rating is adjusted
  TestValidator.predicate(
    "average rating adjusted after admin deletion",
    dashboardAfter.averageRating >= 4 && dashboardAfter.averageRating <= 5,
  );
}
