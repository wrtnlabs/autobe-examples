import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering cancellation requests by status.
 *
 * Validates the cancellation requests list endpoint with status filtering capabilities. The test authenticates as a member and queries the cancellation requests endpoint with different status filters (pending, approved, rejected) to verify the filtering mechanism accepts all valid status values and returns properly structured responses.
 *
 * The test focuses on validating the API endpoint's response structure, pagination metadata, and parameter acceptance for status filtering. Each status filter query verifies that the response contains the expected IPageIShoppingMallCancellationRequest.ISummary structure with pagination information and data array.
 *
 * 1. Member registration and authentication using authorize_member_join utility.
 * 2. Query cancellation requests with status='pending' filter.
 * 3. Validate response structure and pagination metadata.
 * 4. Query with status='approved' filter and validate response.
 * 5. Query with status='rejected' filter and validate response.
 */
export async function test_api_cancellation_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Test filtering by 'pending' status
  const pendingRequests =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 3. Test filtering by 'approved' status
  const approvedRequests =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // 4. Test filtering by 'rejected' status
  const rejectedRequests =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
}
