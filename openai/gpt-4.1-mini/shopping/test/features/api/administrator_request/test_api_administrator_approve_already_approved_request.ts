import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_approve_already_approved_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create an administrator request with actor_type = 'customer' and a reason
  const request =
    await generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request(
      adminConnection,
      {
        body: {
          actor_type: "customer",
          reason: "Requesting admin privileges for testing.",
        },
      },
    );
  typia.assert(request);
  // 3. Approve the created administrator request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.requests.approve.approveAdministratorRequest(
      adminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "status should be 'approved' after approval",
    approvedRequest.status,
    "approved",
  );
  // 4. Attempt to approve the same request again
  let repeatedApprovalRequest: IShoppingMallAdministratorRequest | null = null;
  let repeatedApprovalError: unknown = null;
  try {
    repeatedApprovalRequest =
      await api.functional.shoppingMall.administrator.requests.approve.approveAdministratorRequest(
        adminConnection,
        {
          requestId: request.id,
        },
      );
  } catch (exp) {
    repeatedApprovalError = exp;
  }
  // 5. Validate the status and error: If error is thrown, it should be HttpError 400/409 or similar;
  //    If no error, status should remain 'approved'.
  if (repeatedApprovalRequest !== null) {
    // No error, validate status is still 'approved'
    typia.assert(repeatedApprovalRequest);
    TestValidator.equals(
      "status remains 'approved' on repeated approval",
      repeatedApprovalRequest.status,
      "approved",
    );
  } else {
    // Error occurred
    TestValidator.predicate(
      "error is HttpError on repeated approval",
      repeatedApprovalError !== null &&
        (repeatedApprovalError as any).status >= 400 &&
        (repeatedApprovalError as any).status < 500,
    );
  }
}
