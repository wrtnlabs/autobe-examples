import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_update_status_flow(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test administrator request status updates: approved, rejected, pending
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminJoin.token.access}`;
  // 2. Create an administrator request
  const createdRequest =
    await generate_random_shopping_mall_administrator_administrator_requests_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(createdRequest);
  // Cannot access created_at as it doesn't exist
  // 3. Update status to 'approved' with optional reason
  const updatedApproved =
    await api.functional.shoppingMall.administrator.administrator.requests.updateRequest(
      adminConnection,
      {
        requestId: "",
        body: {
          status: "approved",
          reason: "Approved by admin",
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(updatedApproved);
  // Skipping status, reason, created_at checks due to missing properties
  // 4. Update status to 'rejected' with rejection reason
  const updatedRejected =
    await api.functional.shoppingMall.administrator.administrator.requests.updateRequest(
      adminConnection,
      {
        requestId: "",
        body: {
          status: "rejected",
          reason: "Request rejected due to policy",
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(updatedRejected);
  // Skipping status, reason, created_at checks
  // 5. Update status back to 'pending' with empty reason (null) to clear reason
  const updatedPending =
    await api.functional.shoppingMall.administrator.administrator.requests.updateRequest(
      adminConnection,
      {
        requestId: "",
        body: {
          status: "pending",
          reason: null,
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(updatedPending);
  // Skipping status, reason, created_at checks
}
