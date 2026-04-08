import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_seller_review_snapshots_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Generate a review via utility function (which prepares and creates a review)
  // This creates a review that will have available snapshots
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // 4. Seller retrieves review snapshots with default pagination
  const defaultRequest = {
    page: 1,
    limit: 10,
  } as const;
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: defaultRequest.page,
          limit: defaultRequest.limit,
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate pagination structure and metadata
  TestValidator.predicate(
    "pagination has current page >= 0",
    snapshotsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit > 0",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records >= 0",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages >= 0",
    snapshotsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(snapshotsResponse.data),
  );
  // 6. Test pagination with custom parameters
  const createdAtFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date().toISOString();
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 5,
          createdAtFrom,
          createdAtTo,
        },
      },
    );
  typia.assert(paginatedResponse);
  // 7. Validate custom pagination parameters
  TestValidator.equals(
    "custom page matches request",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit matches request",
    paginatedResponse.pagination.limit,
    5,
  );
  // 8. If there are snapshots, validate snapshot structure
  if (paginatedResponse.data.length > 0) {
    const snapshot = paginatedResponse.data[0];
    TestValidator.predicate(
      "snapshot has valid id",
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid reviewId",
      snapshot.reviewId === review.id,
    );
    TestValidator.predicate(
      "snapshot rating is between 1-5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      typeof snapshot.createdAt === "string",
    );
  }
}
