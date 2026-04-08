import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the administrator's ability to retrieve the complete chronological history of cancellation request snapshots.
 *
 * Validates the snapshot retrieval endpoint for cancellation requests, ensuring proper pagination metadata, response structure, and data format compliance. The test verifies that administrators can access the audit trail of cancellation request state changes.
 *
 * Tests the API endpoint's ability to return snapshot summaries with all required fields including status progression, customer cancellation reasons, seller response reasons, and chronological timestamps. Each snapshot preserves the state at significant events in the cancellation workflow.
 *
 * 1. Administrator authenticates via authorize_admin_join utility.
 * 2. Calls snapshot retrieval endpoint with generated cancellation request UUID.
 * 3. Validates pagination metadata structure and values.
 * 4. Validates snapshot array structure through typia assertion.
 * 5. Verifies chronological ordering of snapshots by created_at timestamp.
 */
export async function test_api_cancellation_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate cancellation request UUID for testing
  const cancellationRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call snapshot retrieval endpoint with empty request body
  const response: IPageIShoppingMallCancellationRequestSnapshot.ISummary =
    await api.functional.shoppingMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequestId,
        body: {} satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata bounds
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination limit within max",
    response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate chronological ordering if multiple snapshots exist
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `snapshots ordered chronologically [${i}] >= [${i - 1}]`,
        new Date(response.data[i].createdAt).getTime() >=
          new Date(response.data[i - 1].createdAt).getTime(),
      );
    }
  }
}
