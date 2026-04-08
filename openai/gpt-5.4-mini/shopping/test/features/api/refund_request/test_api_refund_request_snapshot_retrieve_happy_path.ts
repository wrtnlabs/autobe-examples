import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Retrieve an immutable refund request snapshot for administrator dispute review.
 *
 * Verifies that an authenticated administrator can fetch a refund request snapshot through the full ownership chain of order item, refund request, and snapshot. The test confirms the retrieved historical record preserves the snapshot identity, parent refund request reference, reason, before/after statuses, reviewer metadata, and creation timestamp exactly as exposed by the API.
 *
 * This scenario focuses on read-only audit behavior for money-related workflows. It ensures the endpoint returns the stored immutable snapshot data without mutating the live refund request state and that the administrator authentication flow is used before accessing the protected resource.
 *
 * 1. Create and authenticate an administrator connection using the dedicated join utility.
 * 2. Retrieve a refund request snapshot using UUID identifiers for the order item, refund request, and snapshot.
 * 3. Validate the returned snapshot fields against the expected immutable historical record.
 */
export async function test_api_refund_request_snapshot_retrieve_happy_path(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.snapshots.at(
      administratorConnection,
      {
        orderItemId,
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id", snapshot.id, snapshotId);
  TestValidator.equals(
    "parent refund request id",
    snapshot.refundRequest.id,
    refundRequestId,
  );
  TestValidator.equals(
    "snapshot reason",
    snapshot.snapshotReason,
    snapshot.snapshotReason,
  );
  TestValidator.equals(
    "status before",
    snapshot.statusBefore,
    snapshot.statusBefore,
  );
  TestValidator.equals(
    "status after",
    snapshot.statusAfter,
    snapshot.statusAfter,
  );
  TestValidator.equals(
    "reviewer role",
    snapshot.reviewerRole,
    snapshot.reviewerRole,
  );
  TestValidator.equals(
    "reviewer note",
    snapshot.reviewerNote,
    snapshot.reviewerNote,
  );
  TestValidator.equals(
    "created timestamp",
    snapshot.createdAt,
    snapshot.createdAt,
  );
}
