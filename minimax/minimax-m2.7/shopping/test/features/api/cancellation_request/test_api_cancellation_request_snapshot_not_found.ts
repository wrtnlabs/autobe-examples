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
 * Test scenario for admin attempting to retrieve a non-existent cancellation request snapshot.
 *
 * Prerequisites setup:
 * 1. Authenticate as admin using POST /ecommerceMall/auth/admin/join to obtain JWT token
 *
 * Test execution:
 * - Call GET /ecommerceMall/admin/cancellation-request-snapshots/{snapshotId} with a random UUID
 *   that does not exist in the system
 * - Verify response returns 404 Not Found with appropriate error message indicating the snapshot
 *   was not found
 *
 * Validation points:
 * - System properly validates snapshot existence before returning data
 * - 404 response indicates the snapshot record does not exist in the database
 * - Admin can distinguish between valid and invalid snapshot IDs
 * - This edge case validates the system's data integrity checks when querying for records
 *   that don't exist
 *
 * This scenario ensures proper error handling for invalid resource identifiers.
 */
export async function test_api_cancellation_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to obtain JWT token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random UUID that does not exist in the system
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify 404 error when requesting non-existent snapshot
  await TestValidator.error(
    "should return 404 for non-existent cancellation request snapshot",
    async () => {
      await api.functional.ecommerceMall.admin.cancellation_request_snapshots.at(
        adminConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
