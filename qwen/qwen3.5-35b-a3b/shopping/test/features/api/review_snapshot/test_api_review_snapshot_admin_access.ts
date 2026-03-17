import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test admin's ability to retrieve snapshot audit history for a customer's review.
 * 1. Admin authenticates via /auth/admin/join
 * 2. Seller authenticates via /auth/seller/join
 * 3. Customer authenticates via /auth/customer/join
 * 4. Seller creates a product using /seller/products (POST)
 * 5. Customer writes a review using /customer/reviews (POST)
 * 6. Admin retrieves snapshots using /admin/reviews/{reviewId}/snapshots (PATCH)
 *
 * Success criteria:
 * - Admin can retrieve snapshot history for any customer review without restrictions
 * - The initial snapshot shows snapshot_type = "created" with old_data = null
 * - new_data contains complete review details: rating, title, content, verified_purchase status
 * - Snapshot includes proper references to review and customer entities
 * - Pagination metadata is accurate with correct record counts
 * - Verify the snapshot timestamp and audit trail are properly recorded
 */
export async function test_api_review_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 5. Customer creates a review
  // Note: Review requires order_id, which we need to generate since order creation is not in dependencies
  const mockOrderId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerConnection,
    {
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 3 }),
        product_id: product.id,
        order_id: mockOrderId,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 6. Admin retrieves snapshots
  const snapshotPage =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          limit: 10,
          ordering: "desc",
        },
      },
    );
  typia.assert(snapshotPage);
  // 7. Validate snapshot structure
  TestValidator.equals("has snapshot data", snapshotPage.data.length, 1);
  const snapshot = snapshotPage.data[0];
  typia.assert(snapshot);
  // 8. Validate initial snapshot type is "created"
  TestValidator.equals(
    "snapshot type is created",
    snapshot.snapshot_type,
    "created",
  );
  // 9. Validate old_data is null for created snapshot
  TestValidator.equals("old_data is null for created", snapshot.old_data, null);
  // 10. Validate new_data contains review details
  const newData = JSON.parse(snapshot.new_data) as IEcommerceMallReview;
  typia.assert(newData);
  TestValidator.equals("rating matches", newData.rating, review.rating);
  TestValidator.equals("title matches", newData.title, review.title);
  TestValidator.equals("body matches", newData.body, review.body);
  TestValidator.equals(
    "product_id matches",
    newData.product.id,
    review.product.id,
  );
  TestValidator.equals(
    "is_verified_purchase is true",
    newData.is_verified_purchase,
    true,
  );
  // 11. Validate snapshot references review and customer
  TestValidator.equals("review_id matches", snapshot.review.id, review.id);
  TestValidator.equals(
    "customer_id matches",
    snapshot.customer.id,
    review.customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    snapshot.customer.email,
    review.customer.email,
  );
  // 12. Validate pagination metadata
  TestValidator.equals(
    "pagination records count",
    snapshotPage.pagination.records,
    1,
  );
  TestValidator.equals("pagination limit", snapshotPage.pagination.limit, 10);
  TestValidator.equals("pagination pages", snapshotPage.pagination.pages, 1);
  TestValidator.equals(
    "pagination current",
    snapshotPage.pagination.current,
    1,
  );
  // 13. Validate timestamp
  TestValidator.predicate("snapshot has valid created_at", () => {
    const date = new Date(snapshot.created_at);
    return !isNaN(date.getTime());
  });
}
