import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies cancellation request snapshot history is scoped to the exact parent order item relationship.
 *
 * This test validates that preserved cancellation request snapshots cannot be
 * accessed through a mismatched order-item and cancellation-request pairing.
 * Because snapshot history is immutable and must remain isolated by parent
 * ownership, the endpoint should reject any cross-item lookup attempt with a
 * not-found style error.
 *
 * 1. Authenticate as a customer through the supported join flow.
 * 2. Call the snapshot history endpoint with unrelated UUIDs.
 * 3. Confirm the API rejects the invalid parent-child relationship.
 */
export async function test_api_cancellation_request_snapshot_scope_enforcement(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ChangeMe1234!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cancellation request snapshots should reject mismatched parent-child scope",
    404,
    async () => {
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestid(
        customerConnection,
        {
          orderItemId,
          cancellationRequestId,
        },
      );
    },
  );
}
