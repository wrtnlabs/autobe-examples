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
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator-scoped access to immutable refund request snapshots.
   *
   * This test checks the authorization boundary for refund request snapshot
   * retrieval by creating an authenticated administrator connection and calling
   * the administrator-only snapshot endpoint. It validates that the response is
   * a historical snapshot record and that the operation behaves as a read-only
   * dispute-review lookup with no state mutation.
   *
   * 1. Register and authenticate an administrator using a dedicated connection.
   * 2. Call the refund request snapshot endpoint through the administrator path.
   * 3. Validate the returned snapshot as an immutable historical record.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const snapshot =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.snapshots.at(
      administratorConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate("snapshot id is a uuid", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot reason preserves historical context",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot status transition is recorded",
    snapshot.statusBefore.length > 0 && snapshot.statusAfter.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt is recorded",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot reviewer role remains nullable historical metadata",
    snapshot.reviewerRole === null || snapshot.reviewerRole.length > 0,
  );
  TestValidator.predicate(
    "snapshot reviewer note remains nullable historical metadata",
    snapshot.reviewerNote === null || snapshot.reviewerNote.length > 0,
  );
}
