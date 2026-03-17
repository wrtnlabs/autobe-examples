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
 * Test admin's ability to filter and retrieve review snapshots by change type and date range.
 *
 * This test validates the snapshot filtering functionality for review audit trails,
 * ensuring that admins can accurately query snapshots by type, date range, ordering,
 * and pagination parameters.
 */
export async function test_api_review_snapshot_filter_by_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
    },
  });
  typia.assert(adminResult);
  adminConnection.headers = {
    Authorization: adminResult.token.access,
  };
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
    },
  });
  typia.assert(customerResult);
  customerConnection.headers = {
    Authorization: customerResult.token.access,
  };
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
    },
  });
  typia.assert(sellerResult);
  sellerConnection.headers = {
    Authorization: sellerResult.token.access,
  };
  // 4. Seller creates a product
  const category = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: category,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        slug: typia.random<string>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Customer creates initial review (creates initial "created" snapshot)
  const initialTitle = "Original review title";
  const initialBody = "This is the original review body content.";
  // Generate a valid review with proper order reference
  const initialReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 4,
          title: initialTitle,
          body: initialBody,
          product_id: product.id,
        },
      },
    );
  typia.assert(initialReview);
  // Get the review ID for subsequent operations
  const reviewId = initialReview.id;
  typia.assert(reviewId);
  // 6. Retrieve all snapshots (before edit)
  const allSnapshotsBeforeEdit =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {},
      },
    );
  typia.assert(allSnapshotsBeforeEdit);
  // Verify we have at least 1 snapshot (created)
  TestValidator.equals(
    "initial snapshots count",
    allSnapshotsBeforeEdit.data.length,
    1,
  );
  // 7. Customer edits the review to create a "modified" snapshot
  const editedTitle = "Edited review title";
  const editedBody = "This is the edited review body content.";
  const updatedReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          title: editedTitle,
          body: editedBody,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // Verify the review was updated
  TestValidator.equals(
    "edited review title matches",
    updatedReview.title,
    editedTitle,
  );
  TestValidator.equals(
    "edited review body matches",
    updatedReview.body,
    editedBody,
  );
  // 8. Retrieve all snapshots after edit (should now have 2)
  const allSnapshotsAfterEdit =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {},
      },
    );
  typia.assert(allSnapshotsAfterEdit);
  TestValidator.equals(
    "total snapshots after edit",
    allSnapshotsAfterEdit.data.length,
    2,
  );
  // 9. Test snapshot_type filter for "created"
  const createdSnapshots =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          snapshotType: "created" as const,
        },
      },
    );
  typia.assert(createdSnapshots);
  TestValidator.equals(
    "created snapshots count",
    createdSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "created snapshot type",
    createdSnapshots.data[0].snapshot_type,
    "created",
  );
  // Verify the created snapshot's new_data contains original content
  const createdSnapshot = createdSnapshots.data[0];
  typia.assert(createdSnapshot);
  const createdNewData = JSON.parse(
    createdSnapshot.new_data,
  ) as IEcommerceMallReview;
  TestValidator.equals(
    "created snapshot new_data title",
    createdNewData.title,
    initialTitle,
  );
  TestValidator.equals(
    "created snapshot new_data body",
    createdNewData.body,
    initialBody,
  );
  // 10. Test snapshot_type filter for "modified"
  const modifiedSnapshots =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          snapshotType: "modified" as const,
        },
      },
    );
  typia.assert(modifiedSnapshots);
  TestValidator.equals(
    "modified snapshots count",
    modifiedSnapshots.data.length,
    1,
  );
  // Verify the modified snapshot's old_data and new_data
  const modifiedSnapshot = modifiedSnapshots.data[0];
  typia.assert(modifiedSnapshot);
  const oldData = JSON.parse(modifiedSnapshot.old_data!) as IEcommerceMallReview;
  const newData = JSON.parse(modifiedSnapshot.new_data!) as IEcommerceMallReview;
  TestValidator.equals(
    "modified snapshot old_data title",
    oldData.title,
    initialTitle,
  );
  TestValidator.equals(
    "modified snapshot old_data body",
    oldData.body,
    initialBody,
  );
  TestValidator.equals(
    "modified snapshot new_data title",
    newData.title,
    editedTitle,
  );
  TestValidator.equals(
    "modified snapshot new_data body",
    newData.body,
    editedBody,
  );
  // 11. Test date_range filtering
  const createdAtGte = createdSnapshots.data[0].created_at;
  const createdAtLte = modifiedSnapshots.data[0].created_at;
  const dateFilteredSnapshots =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          createdAtGte: createdAtGte,
          createdAtLte: createdAtLte,
        },
      },
    );
  typia.assert(dateFilteredSnapshots);
  TestValidator.predicate(
    "date filtered snapshots count >= 1",
    dateFilteredSnapshots.data.length >= 1,
  );
  // 12. Test ordering parameter (ascending)
  const ascendingSnapshots =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          ordering: "asc" as const,
        },
      },
    );
  typia.assert(ascendingSnapshots);
  TestValidator.equals(
    "ascending snapshots count",
    ascendingSnapshots.data.length,
    2,
  );
  // Verify ordering is ascending by created_at
  for (let i = 1; i < ascendingSnapshots.data.length; i++) {
    const prevCreated = new Date(
      ascendingSnapshots.data[i - 1].created_at,
    ).getTime();
    const currCreated = new Date(
      ascendingSnapshots.data[i].created_at,
    ).getTime();
    TestValidator.predicate(
      `snapshot ${i} created_at >= snapshot ${i - 1}`,
      currCreated >= prevCreated,
    );
  }
  // 13. Test ordering parameter (descending - default)
  const descendingSnapshots =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          ordering: "desc" as const,
        },
      },
    );
  typia.assert(descendingSnapshots);
  TestValidator.equals(
    "descending snapshots count",
    descendingSnapshots.data.length,
    2,
  );
  // Verify ordering is descending by created_at
  for (let i = 1; i < descendingSnapshots.data.length; i++) {
    const prevCreated = new Date(
      descendingSnapshots.data[i - 1].created_at,
    ).getTime();
    const currCreated = new Date(
      descendingSnapshots.data[i].created_at,
    ).getTime();
    TestValidator.predicate(
      `snapshot ${i} created_at <= snapshot ${i - 1}`,
      currCreated <= prevCreated,
    );
  }
  // 14. Test cursor-based pagination - SKIPPED: IPagination does not have cursor property
  // Cursor-based pagination is not supported by this API
  // 15. Combined filtering: modified snapshots with ordering
  const combinedFilterSnapshots =
    await api.functional.ecommerceMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          snapshotType: "modified" as const,
          ordering: "desc" as const,
        },
      },
    );
  typia.assert(combinedFilterSnapshots);
  TestValidator.equals(
    "combined filter modified count",
    combinedFilterSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter all modified type",
    combinedFilterSnapshots.data.every(
      (snap) => snap.snapshot_type === "modified",
    ),
    true,
  );
}