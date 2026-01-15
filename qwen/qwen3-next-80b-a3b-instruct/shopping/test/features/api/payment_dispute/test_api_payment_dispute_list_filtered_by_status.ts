import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentDispute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_dispute_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Test filtering by each valid status value
  // The status values that can be filtered by
  const disputeStatuses = [
    "open",
    "under_review",
    "resolved",
    "rejected",
    "cancelled",
  ] as const;
  // For each status, verify the filtering works correctly
  for (const status of disputeStatuses) {
    // Make a request to filter disputes by current status
    const response: IPageIShoppingMallPaymentDispute.ISummary =
      await api.functional.shoppingMall.admin.payment_disputes.index(
        adminConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallPaymentDispute.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", response.pagination.limit, 10);
    TestValidator.predicate(
      "pagination records >= 0",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      response.pagination.pages >= 0,
    );
    // Ensure that disputes in the response have the correct status (if any disputes exist)
    // Note: There might be no disputes with a particular status, so we only validate the status
    // of any disputes that are returned, not that any must exist
    for (const dispute of response.data) {
      TestValidator.equals(
        `dispute status should be ${status}`,
        dispute.status,
        status,
      );
    }
    // The API should accept the status parameter and return a properly formatted response
    // Even if no disputes exist for this status, the API should still return a valid response
    // This validates that the filtering parameter is properly handled
  }
}
