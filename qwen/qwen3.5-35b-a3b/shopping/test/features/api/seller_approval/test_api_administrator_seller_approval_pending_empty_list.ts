import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the edge case where no pending seller approval requests exist in the system.
 *
 * Validates that the seller approval pending list endpoint returns an empty but properly formatted paginated response when there are no pending requests to display. Tests the administrator's ability to access the endpoint even with zero pending requests.
 *
 * The test ensures that pagination metadata is correctly calculated for empty result sets, with records and pages both equal to 0, while the data array is an empty array. No errors should be thrown when handling empty result sets.
 *
 * 1. Administrator joins the platform with valid credentials.
 * 2. Administrator accesses the pending seller approval list endpoint.
 * 3. Verify pagination metadata shows zero records and zero pages.
 * 4. Verify data array is empty [].
 * 5. Verify response structure is valid despite empty data.
 */
export async function test_api_administrator_seller_approval_pending_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Administrator accesses pending seller approval list (empty state)
  const response: IPageIEcommerceMallSellerApprovalRequest.ISummary =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Verify pagination metadata for empty result set
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", response.pagination.pages, 0);
  // 4. Verify data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
}
