import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_shopping_mall_administrator_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create";

export async function test_api_administrator_requests_reject_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator signup to get authorization tokens
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Inject authorization token into administrator connection
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Administrator creates a new administrator request
  const adminRequestRaw =
    await generate_random_shopping_mall_administrator_administrator_requests_create(
      adminConnection,
      { body: {} },
    );
  // Cast adminRequest to any to access 'id'
  const adminRequest = adminRequestRaw as any;
  typia.assert(adminRequestRaw);
  // Administrator rejects the pending administrator request
  const rejectedRequestRaw =
    await api.functional.shoppingMall.administrator.administrator.requests.reject(
      adminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  // Cast rejectedRequest to any to access 'status'
  const rejectedRequest = rejectedRequestRaw as any;
  typia.assert(rejectedRequestRaw);
  // Validate that the status of the admin request changes to 'rejected'
  TestValidator.equals(
    "admin request status",
    rejectedRequest.status,
    "rejected",
  );
}
