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
 * Verifies cancellation request snapshot history is rejected outside the exact order-item scope.
 *
 * This test checks that the cancellation-request snapshot history endpoint enforces the relationship between
 * an order item and its cancellation request, returning a not-found style error when the identifiers do not
 * belong to the same scoped resource pair.
 *
 * 1. Registers two authenticated customer sessions.
 * 2. Calls the snapshot history endpoint with mismatched order-item and cancellation-request identifiers.
 * 3. Confirms the API rejects cross-scope access instead of exposing snapshot history.
 */
export async function test_api_cancellation_request_snapshot_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string as string &
          tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(9)}@test.com` satisfies string as string &
          tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const wrongOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cancellation request snapshots should reject mismatched order item and cancellation request identifiers",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
        customerAConnection,
        {
          orderItemId: wrongOrderItemId,
          cancellationRequestId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "cancellation request snapshots should reject access even for another authenticated customer when identifiers are unrelated",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
        customerBConnection,
        {
          orderItemId,
          cancellationRequestId,
        },
      );
    },
  );
}
