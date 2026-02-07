import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_requests_history(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer account using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Retrieve the customer's refund request history
  const refundRequests =
    await api.functional.shoppingMall.customer.refund_requests.get(
      customerConnection,
    );
  typia.assert(refundRequests);
  // Step 3: Validate the response structure - it must be IPageIShoppingMallRefundRequest
  TestValidator.equals(
    "pagination is present",
    refundRequests.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data array is present",
    refundRequests.data !== null,
    true,
  );
  // Validate pagination properties (business logic validation of structure, not type)
  TestValidator.predicate(
    "pagination current is >= 1",
    refundRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is > 0",
    refundRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    refundRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    refundRequests.pagination.pages >= 0,
  );
  // Validate each refund request in data array - only business logic checks
  refundRequests.data.forEach((refundRequest, index) => {
    const typedRefundRequest = typia.assert<{ deleted_at: string | null; status: 'pending' | 'approved' | 'rejected'; created_at: string; auto_approval_deadline: string }>(refundRequest);
    // Ensure records are active (deleted_at is null)
    TestValidator.equals(
      `refundRequest[${index}].deleted_at is null`,
      typedRefundRequest.deleted_at === null,
      true,
    );
    // Validate auto_approval_deadline = created_at + 72 hours for pending requests
    if (typedRefundRequest.status === "pending") {
      const created = new Date(typedRefundRequest.created_at);
      const deadline = new Date(typedRefundRequest.auto_approval_deadline);
      const hoursDifference =
        (deadline.getTime() - created.getTime()) / (1000 * 60 * 60);
      TestValidator.equals(
        `refundRequest[${index}].auto_approval_deadline is created_at + 72h`,
        Math.abs(hoursDifference - 72) < 1,
        true,
      );
    }
  });
  // Ensure at least one refund request exists (since customer joined)
  TestValidator.predicate(
    "at least one refund request exists",
    refundRequests.data.length > 0,
  );
  // Validate ordering: newest first (created_at descending)
  for (let i = 0; i < refundRequests.data.length - 1; i++) {
    const typedCurrent = typia.assert<{ created_at: string }>(refundRequests.data[i]);
    const typedNext = typia.assert<{ created_at: string }>(refundRequests.data[i + 1]);
    const current = new Date(typedCurrent.created_at);
    const next = new Date(typedNext.created_at);
    TestValidator.predicate(
      `refund requests ordered by created_at descending`,
      current >= next,
    );
  }
}