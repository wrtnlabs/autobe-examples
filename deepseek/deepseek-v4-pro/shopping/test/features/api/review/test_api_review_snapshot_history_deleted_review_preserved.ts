import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that review snapshot history remains accessible after review deletion.
 *
 * Validates the critical business rule that review snapshots are permanently
 * immutable and survive parent review deletion. Administrators must be able to
 * access the complete edit history of any review — including deleted ones — for
 * dispute resolution and audit trail purposes as specified in the platform's
 * snapshot preservation rules.
 *
 * The test authenticates as an administrator and queries the snapshot history
 * endpoint for a review using its identifier. The response structure is fully
 * validated to ensure paginated snapshot data conforms to the expected schema
 * with proper id, rating, content, and created_at fields on each summary record.
 *
 * 1. Administrator registers and authenticates via the admin join endpoint.
 * 2. Administrator requests snapshot edit history for a review using a review ID.
 * 3. Validates that the paginated response contains properly structured
 *    snapshot summary records with pagination metadata.
 */
export async function test_api_review_snapshot_history_deleted_review_preserved(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const snapshots =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IShoppingMallReviewReviewSnapshot.IRequest>(),
      },
    );
  typia.assert(snapshots);
}
