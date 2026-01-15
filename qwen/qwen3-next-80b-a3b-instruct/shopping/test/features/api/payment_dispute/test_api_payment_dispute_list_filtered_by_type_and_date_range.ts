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
export async function test_api_payment_dispute_list_filtered_by_type_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin user using the provided utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Generate a date range for filtering (last 30 days)
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Define the dispute type to filter by
  const disputeType: IShoppingMallPaymentDispute.IRequest["type"] =
    "chargeback";
  // Call the payment dispute index endpoint with the search criteria
  const result: IPageIShoppingMallPaymentDispute.ISummary =
    await api.functional.shoppingMall.admin.payment_disputes.index(
      adminConnection,
      {
        body: {
          type: disputeType,
          startDate: startDate,
          endDate: endDate,
        } satisfies IShoppingMallPaymentDispute.IRequest,
      },
    );
  typia.assert(result);
  // Validate that all returned disputes match the filter criteria
  result.data.forEach((dispute) => {
    TestValidator.equals(
      "dispute type matches filter",
      dispute.dispute_type,
      disputeType,
    );
    TestValidator.predicate(
      "dispute created within date range",
      dispute.disputed_at >= startDate && dispute.disputed_at <= endDate,
    );
  });
  // Validate default sorting by disputed_at desc (implicit, no sort parameter)
  // Handle edge case: if 0 or 1 records, no sorting validation needed
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = result.data[i];
      const next = result.data[i + 1];
      TestValidator.predicate(
        "disputs sorted by disputed_at desc",
        current.disputed_at >= next.disputed_at,
      );
    }
  }
}
