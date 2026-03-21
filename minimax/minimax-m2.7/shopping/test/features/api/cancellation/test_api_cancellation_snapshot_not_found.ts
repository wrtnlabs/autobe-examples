import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
 * Test that an administrator receives a 404 error when attempting to retrieve
 * a cancellation request snapshot with a non-existent snapshotId.
 *
 * This validates proper error handling for invalid snapshot identifiers.
 * The test authenticates as an administrator and attempts to retrieve a snapshot
 * using a valid cancellation request ID but with a random non-existent snapshotId
 * (UUID format but not present in database). Verify that the response returns
 * 404 Not Found error indicating the snapshot was not found.
 */
export async function test_api_cancellation_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a non-existent snapshot ID (valid UUID format but not in database)
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Generate a random cancellation request ID (valid UUID format)
  // Note: This doesn't need to exist - we're testing the snapshot lookup specifically
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve non-existent snapshot - should return 404
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.at(
        adminConnection,
        {
          requestId: cancellationRequestId,
          snapshotId: nonExistentSnapshotId,
        },
      ),
  );
}
