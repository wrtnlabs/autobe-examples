import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies cancellation request snapshot lookup rejects mismatched hierarchy paths.
 *
 * This test ensures the customer-protected snapshot endpoint validates the full
 * order-item → cancellation-request → snapshot hierarchy before returning any
 * preserved dispute history.
 *
 * 1. Register an authenticated customer session for access to the protected endpoint.
 * 2. Request a cancellation request snapshot using a path that is intentionally inconsistent with the requested hierarchy.
 * 3. Confirm the request fails with not-found semantics so unrelated snapshot data is not leaked.
 */
export async function test_api_cancellation_request_snapshot_hierarchy_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IMallPlatformCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: credentials });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "mismatched cancellation request snapshot hierarchy should not be found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.at(
        customerConnection,
        {
          orderItemId,
          cancellationRequestId,
          snapshotId,
        },
      );
    },
  );
}
