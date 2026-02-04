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
export async function test_api_cancellation_request_already_resolved_reject(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a random cancellation request ID (since we cannot create one)
  // Use a random UUID that doesn't exist in the system
  const cancellationRequestId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: First update: approve the cancellation request
  // This is a simulated approval of a fictional cancellation request
  await api.functional.shoppingMall.admin.cancellation_requests.update(
    adminConnection,
    {
      cancellationRequestId,
      body: {
        action: "approve",
      } satisfies IShoppingMallCancellationRequest.IResponse,
    },
  );
  // Step 4: Second update: attempt to reject the already-approved cancellation request
  // This should result in 400 Bad Request with error indicating request is already resolved
  await TestValidator.error(
    "should reject already-resolved cancellation request",
    async () => {
      await api.functional.shoppingMall.admin.cancellation_requests.update(
        adminConnection,
        {
          cancellationRequestId,
          body: {
            action: "reject",
            reason: "Invalid reason for already-resolved request",
          } satisfies IShoppingMallCancellationRequest.IResponse,
        },
      );
    },
  );
}
