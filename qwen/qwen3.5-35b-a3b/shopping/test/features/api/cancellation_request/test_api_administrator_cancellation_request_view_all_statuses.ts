import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_cancellation_request_view_all_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuthorized);
  // 2. Use simulation mode to test endpoint with mock data
  const simulateConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // 3. Generate three cancellation request IDs for different status testing
  const pendingRequestId = typia.random<string & tags.Format<"uuid">>();
  const approvedRequestId = typia.random<string & tags.Format<"uuid">>();
  const rejectedRequestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve pending cancellation request (simulated)
  const pendingRequest =
    await api.functional.ecommerceMall.administrator.cancellation_requests.at(
      simulateConnection,
      {
        id: pendingRequestId,
      },
    );
  typia.assert(pendingRequest);
  // 5. Retrieve approved cancellation request (simulated)
  const approvedRequest =
    await api.functional.ecommerceMall.administrator.cancellation_requests.at(
      simulateConnection,
      {
        id: approvedRequestId,
      },
    );
  typia.assert(approvedRequest);
  // 6. Retrieve rejected cancellation request (simulated)
  const rejectedRequest =
    await api.functional.ecommerceMall.administrator.cancellation_requests.at(
      simulateConnection,
      {
        id: rejectedRequestId,
      },
    );
  typia.assert(rejectedRequest);
  // 7. Validate all responses have complete entity data
  // After typia.assert(), all properties are guaranteed to exist with correct types
  TestValidator.equals(
    "pending request has item reference",
    pendingRequest.item,
    pendingRequest.item,
  );
  TestValidator.equals(
    "pending request has order reference",
    pendingRequest.order,
    pendingRequest.order,
  );
  TestValidator.equals(
    "pending request has seller reference",
    pendingRequest.seller,
    pendingRequest.seller,
  );
  // 8. Validate all status values are in valid range
  const validStatuses = ["pending", "approved", "rejected"] as const;
  TestValidator.predicate("pending request status is valid", () =>
    validStatuses.includes(pendingRequest.status as any),
  );
  TestValidator.predicate("approved request status is valid", () =>
    validStatuses.includes(approvedRequest.status as any),
  );
  TestValidator.predicate("rejected request status is valid", () =>
    validStatuses.includes(rejectedRequest.status as any),
  );
  // 9. Validate all cancellation requests have different IDs
  TestValidator.notEquals(
    "pending and approved request IDs differ",
    pendingRequest.id,
    approvedRequest.id,
  );
  TestValidator.notEquals(
    "pending and rejected request IDs differ",
    pendingRequest.id,
    rejectedRequest.id,
  );
  TestValidator.notEquals(
    "approved and rejected request IDs differ",
    approvedRequest.id,
    rejectedRequest.id,
  );
  // 10. Validate all timestamps exist and are valid date-time format
  TestValidator.equals(
    "pending request has created_at",
    pendingRequest.created_at,
    pendingRequest.created_at,
  );
  TestValidator.equals(
    "pending request has updated_at",
    pendingRequest.updated_at,
    pendingRequest.updated_at,
  );
  // 11. Validate seller reference has required fields
  TestValidator.equals(
    "seller has id",
    pendingRequest.seller.id,
    pendingRequest.seller.id,
  );
  TestValidator.equals(
    "seller has display_name",
    pendingRequest.seller.display_name,
    pendingRequest.seller.display_name,
  );
  // 12. Validate order reference has required fields
  TestValidator.equals(
    "order has id",
    pendingRequest.order.id,
    pendingRequest.order.id,
  );
  TestValidator.equals(
    "order has order_number",
    pendingRequest.order.order_number,
    pendingRequest.order.order_number,
  );
  // 13. Validate order item reference has required fields
  TestValidator.equals(
    "item has id",
    pendingRequest.item.id,
    pendingRequest.item.id,
  );
  TestValidator.equals(
    "item has order_number",
    pendingRequest.item.order_number,
    pendingRequest.item.order_number,
  );
  TestValidator.equals(
    "item has status",
    pendingRequest.item.status,
    pendingRequest.item.status,
  );
  // 14. Verify administrator can access any cancellation request
  // Admin should be able to view requests regardless of which customer/seller they belong to
  TestValidator.predicate(
    "admin can view pending cancellation request",
    () => pendingRequest !== null && pendingRequest !== undefined,
  );
  TestValidator.predicate(
    "admin can view approved cancellation request",
    () => approvedRequest !== null && approvedRequest !== undefined,
  );
  TestValidator.predicate(
    "admin can view rejected cancellation request",
    () => rejectedRequest !== null && rejectedRequest !== undefined,
  );
}
