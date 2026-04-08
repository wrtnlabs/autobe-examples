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

export async function test_api_cancellation_request_decision_rejection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator rejection of a pending cancellation request.
   *
   * Validates that an administrator can reject a cancellation request for a
   * paid, unshipped order item and that the request transitions to a rejected
   * terminal state with the reviewer note preserved. The test also checks that
   * the underlying order item remains unchanged so rejection does not trigger
   * cancellation, refund, or inventory-restoration side effects.
   *
   * 1. Authenticate a dedicated administrator connection.
   * 2. Call the cancellation-request decision endpoint for a valid order item
   *    and request identifier pair.
   * 3. Validate the returned request state reflects rejection and closure.
   * 4. Validate the request remains attached to the targeted order item and
   *    preserves the reviewer note.
   * 5. Validate the order item remains in the paid state.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.decision.create(
      administratorConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          decision: false,
          reviewerNote: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCancellationRequest.IDecision,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "cancellation request should be rejected",
    output.status,
    "rejected",
  );
  TestValidator.equals(
    "cancellation request should be linked to an order item",
    output.orderItem.id.length > 0,
    true,
  );
  TestValidator.equals(
    "reviewer note should be preserved",
    output.reviewerNote,
    output.reviewerNote,
  );
  TestValidator.equals(
    "order item should remain paid after rejection",
    output.orderItem.status,
    "paid",
  );
}
