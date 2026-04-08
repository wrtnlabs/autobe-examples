import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Browse immutable snapshot history for a review as an administrator.
 *
 * Validates that the administrator review snapshot history endpoint returns a
 * paginated, immutable record set ordered by newest first. The test focuses on
 * the historical browsing contract, ensuring that preserved review and customer
 * references remain available alongside snapshot metadata such as action,
 * rating, content, deletion state, and created-at timestamps.
 *
 * 1. Authenticate as an administrator using an isolated connection.
 * 2. Browse review snapshot history for a review identifier.
 * 3. Validate pagination metadata and newest-first ordering.
 * 4. Confirm each snapshot preserves the related review and customer summaries.
 */
export async function test_api_review_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const request: IMallPlatformReviewSnapshot.IRequest = {
    page: 1,
    limit: 2,
    sort: "-createdAt",
  };
  const firstPage =
    await api.functional.mallPlatform.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "pagination counts are non-negative",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "first page is ordered newest first",
    firstPage.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        new Date(array[index - 1].createdAt).getTime() >=
          new Date(snapshot.createdAt).getTime(),
    ),
  );
  for (const snapshot of firstPage.data) {
    TestValidator.predicate(
      "snapshot contains a preserved review reference",
      snapshot.review.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot contains a preserved customer reference",
      snapshot.customer.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot action is recorded",
      snapshot.snapshotAction.length > 0,
    );
    TestValidator.predicate(
      "snapshot rating is within the valid review range",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot createdAt is populated",
      snapshot.createdAt.length > 0,
    );
  }
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.mallPlatform.administrator.reviews.snapshots.index(
        adminConnection,
        {
          reviewId,
          body: {
            ...request,
            page: 2,
          },
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current page",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page is ordered newest first",
      secondPage.data.every(
        (snapshot, index, array) =>
          index === 0 ||
          new Date(array[index - 1].createdAt).getTime() >=
            new Date(snapshot.createdAt).getTime(),
      ),
    );
  }
}
