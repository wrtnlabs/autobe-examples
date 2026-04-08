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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator browsing of refund request snapshot history with pagination.
 *
 * Validates the immutable history stream for a refund request belonging to a specific order item. The test authenticates an administrator through the required join workflow, then requests the first page of snapshot history and confirms that the response contains coherent pagination metadata and read-only snapshot summaries.
 *
 * The scenario focuses on dispute-review history rather than mutation. It verifies that returned snapshots are scoped consistently to one refund request, are ordered newest-first by default when no explicit sort is supplied, and expose the preserved before-and-after state together with reviewer metadata needed for audit workflows.
 *
 * 1. Authenticate an administrator using an isolated connection derived from the base host.
 * 2. Request refund request snapshot history for valid UUID path parameters with pagination controls.
 * 3. Validate the page metadata and the immutable snapshot payload shape.
 * 4. Confirm the default ordering is newest-first by comparing adjacent createdAt values.
 */
export async function test_api_refund_request_snapshot_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12) + "1!A",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    refundRequestId: typia.random<string & tags.Format<"uuid">>(),
    body: {
      page: 1,
      limit: 10,
    } satisfies IMallPlatformRefundRequestSnapshot.IRequest,
  } satisfies api.functional.mallPlatform.administrator.orderItems.refundRequests.snapshots.index.Props;
  const response =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.snapshots.index(
      administratorConnection,
      request,
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page should match request",
    response.pagination.current,
    request.body.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    response.pagination.limit,
    request.body.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed requested limit",
    response.data.length <= request.body.limit!,
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot should reference the live refund request payload consistently",
      snapshot.refundRequest.id,
      response.data[0]?.refundRequest.id ?? snapshot.refundRequest.id,
    );
    TestValidator.predicate(
      "snapshot reason should be recorded",
      snapshot.snapshotReason.length > 0,
    );
    TestValidator.predicate(
      "status before should be recorded",
      snapshot.statusBefore.length > 0,
    );
    TestValidator.predicate(
      "status after should be recorded",
      snapshot.statusAfter.length > 0,
    );
    TestValidator.predicate(
      "createdAt should be recorded",
      snapshot.createdAt.length > 0,
    );
  }
  for (let i = 1; i < response.data.length; ++i) {
    TestValidator.predicate(
      "refund request snapshots should be ordered newest first by default",
      response.data[i - 1].createdAt >= response.data[i].createdAt,
    );
  }
}
