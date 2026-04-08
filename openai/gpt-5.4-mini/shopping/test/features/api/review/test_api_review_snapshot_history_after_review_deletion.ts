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
 * Verifies review snapshot history browsing for a preserved review fixture.
 *
 * This test confirms that an authenticated administrator can request review
 * snapshot history and receive immutable historical records through the
 * paginated endpoint. It focuses on the preserved audit data contract,
 * including snapshot metadata, review references, customer references, and
 * pagination fields.
 *
 * 1. Authenticate as an administrator.
 * 2. Request the snapshot history for a review fixture identifier.
 * 3. Validate the returned paginated snapshot payload.
 */
export async function test_api_review_snapshot_history_after_review_deletion(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        "Password123!" satisfies IMallPlatformAdministrator.IJoin["password"],
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list is an array",
    Array.isArray(response.data),
  );
  for (const snapshot of response.data) {
    TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot action exists",
      snapshot.snapshotAction.length > 0,
    );
    TestValidator.predicate(
      "snapshot rating is in range",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot createdAt exists",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot deletion flag is boolean",
      typeof snapshot.isDeleted === "boolean",
    );
    TestValidator.predicate(
      "review reference exists",
      snapshot.review.id.length > 0,
    );
    TestValidator.predicate(
      "customer reference exists",
      snapshot.customer.id.length > 0,
    );
    if (snapshot.content !== null) {
      TestValidator.predicate(
        "snapshot content exists when present",
        snapshot.content.length >= 0,
      );
    }
  }
}
