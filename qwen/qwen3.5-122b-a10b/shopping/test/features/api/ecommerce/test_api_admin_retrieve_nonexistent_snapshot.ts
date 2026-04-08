import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
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
 * Test administrator retrieval of non-existent review snapshot.
 *
 * Validates that attempting to access a review snapshot with a non-existent snapshot ID returns a proper 404 Not Found error. This test ensures the system handles invalid snapshot references gracefully without exposing information about which snapshots actually exist in the database.
 *
 * The test authenticates as an administrator, then attempts to retrieve a snapshot using a valid UUID format for the review ID but a non-existent snapshot ID. The system should reject this request with a 404 status code.
 *
 * 1. Authenticate as administrator using authorize_admin_join.
 * 2. Generate valid UUID for reviewId and snapshotId (both valid format but snapshot does not exist).
 * 3. Attempt to retrieve the non-existent snapshot via admin endpoint.
 * 4. Verify 404 Not Found error is returned without exposing snapshot existence information.
 */
export async function test_api_admin_retrieve_nonexistent_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Generate UUIDs for review and snapshot (snapshot does not exist)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify 404 Not Found error when retrieving non-existent snapshot
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () => {
      await api.functional.ecommerce.admin.admin.reviews.snapshots.at(
        adminConnection,
        {
          reviewId,
          snapshotId,
        },
      );
    },
  );
}
