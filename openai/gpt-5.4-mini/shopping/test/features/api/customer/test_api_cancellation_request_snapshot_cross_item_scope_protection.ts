import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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
 * Protects cancellation request snapshot history from cross-item access.
 *
 * Verifies that the nested snapshot endpoint enforces parent-child ownership boundaries.
 * The test creates isolated authenticated customer contexts and attempts to browse
 * cancellation request snapshot history with mismatched route identifiers so that the
 * platform's nested scoping rules are exercised directly.
 *
 * 1. Register authenticated customer contexts without using the base connection directly.
 * 2. Attempt to query cancellation request snapshots with mismatched order-item and request identifiers.
 * 3. Confirm the platform rejects the cross-item lookup with standard not-found or forbidden behavior.
 */
export async function test_api_cancellation_request_snapshot_cross_item_scope_protection(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(secondCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup-alt",
      referrer: "https://example.com/landing-alt",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-item cancellation request snapshots should be rejected",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
        customerConnection,
        {
          orderItemId,
          cancellationRequestId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformCancellationRequestSnapshot.IRequest,
        },
      );
    },
  );
}
