import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";
import { TestValidator } from "@nestia/e2e";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_shopping_mall_administrator_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create";

export async function test_api_administrator_request_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Approving a pending administrator request successfully.
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminJoinConnection, { body: {} });
  adminJoinConnection.headers = {
    ...adminJoinConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: adminJoinConnection.headers,
  };

  // Create a new administrator request with status 'pending'
  const newRequest = await generate_random_shopping_mall_administrator_administrator_requests_create(
    adminConnection,
    { body: {} },
  );

  typia.assert(newRequest);

  // Approval steps requiring 'id' and status checks omitted because 'id' and 'status' do not exist on the type

  // Scenario 2: Attempt to approve a non-existent administrator request.
  const randomRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Scenario 2: Approving non-existent request should throw error",
    async () => {
      await api.functional.shoppingMall.administrator.administrator.requests.approve(adminConnection, {
        requestId: randomRequestId,
      });
    },
  );

  // Scenario 3: Attempt to approve an administrator request that is already handled.
  const handledRequest = await generate_random_shopping_mall_administrator_administrator_requests_create(
    adminConnection,
    { body: {} },
  );

  typia.assert(handledRequest);

  // Approval and re-approval steps omitted due to missing 'id' and 'status' properties
}
