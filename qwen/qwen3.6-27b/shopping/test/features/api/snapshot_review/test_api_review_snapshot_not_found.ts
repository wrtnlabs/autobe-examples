import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that requesting a non-existent snapshot review returns a 404 HTTP error.
 *
 * Validates that the admin snapshot review detail endpoint properly handles requests for UUIDs that do not correspond to any existing snapshot review record. Ensures no data is exposed and the correct HTTP status code is returned for missing resources.
 *
 * 1. Administrator registers and authenticates via join endpoint.
 * 2. A random UUID that does not exist in the system is generated.
 * 3. Administrator attempts to fetch the non-existent snapshot review by ID.
 * 4. Validates that an HTTP 404 Not Found error is thrown with no data leakage.
 */
export async function test_api_review_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. Generate random non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify 404 error when fetching non-existent snapshot review
  await TestValidator.httpError(
    "non-existent snapshot review returns 404",
    404,
    async () =>
      await api.functional.ecommercePlatform.admin.snapshot_reviews.at(
        adminConnection,
        {
          snapshotReviewId: nonExistentId,
        },
      ),
  );
}
