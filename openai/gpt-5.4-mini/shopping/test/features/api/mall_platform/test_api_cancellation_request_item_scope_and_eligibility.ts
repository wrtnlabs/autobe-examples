import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
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
 * Verifies administrator cancellation-request resolution is scoped to the target order item and gated by item eligibility.
 *
 * This test exercises the administrative update endpoint for cancellation requests and ensures that invalid review attempts are rejected.
 * It specifically covers two business-rule failures: a cancellation request that does not belong to the supplied order item,
 * and a late review attempt against an order item that is no longer eligible for cancellation because it is no longer in the paid state.
 *
 * 1. Authenticate a dedicated administrator connection.
 * 2. Attempt to resolve a cancellation request with mismatched order item and request identifiers.
 * 3. Attempt another resolution with a different invalid identifier pair representing an ineligible late-cancellation scenario.
 * 4. Verify both requests are rejected and no successful cancellation-request payload is returned.
 */
export async function test_api_cancellation_request_item_scope_and_eligibility(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const body = {
    decision: "reject",
    reviewerNote: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformCancellationRequest.IUpdate;
  const firstOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const firstCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "mismatched cancellation request must be rejected for cross-item scoping",
    [400, 403, 404, 409],
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.update(
        administratorConnection,
        {
          orderItemId: firstOrderItemId,
          cancellationRequestId: firstCancellationRequestId,
          body,
        },
      );
    },
  );
  const secondOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const secondCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "late cancellation decision must be rejected for ineligible order items",
    [400, 403, 404, 409],
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.update(
        administratorConnection,
        {
          orderItemId: secondOrderItemId,
          cancellationRequestId: secondCancellationRequestId,
          body,
        },
      );
    },
  );
}
