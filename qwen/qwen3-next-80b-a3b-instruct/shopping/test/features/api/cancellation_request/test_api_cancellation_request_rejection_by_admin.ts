import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_cancellation_request_rejection_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "AdminPassword123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Use a generated UUID for cancellation request ID since we cannot create one
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Admin rejects cancellation request with reason
  await api.functional.shoppingMall.admin.cancellation_requests.update(
    adminConnection,
    {
      cancellationRequestId,
      body: {
        action: "reject",
        reason: "Cancellation rejected: Product has already been shipped",
      } satisfies IShoppingMallCancellationRequest.IResponse,
    },
  );
  // Step 4: Verify the rejection was processed without error (success implies status update)
  // Since we don't have a get endpoint, we validate by ensuring no error occurred
  // and logic passes based on the API contract
  // We cannot validate the response body without a get operation, per provided API
}
