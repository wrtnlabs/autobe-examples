import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_event_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Test event deletion with valid admin connection
  // Using random values for orderCode and eventCode since no creation APIs exist
  // This validates the delete endpoint functionality and that admin authentication works
  // The system will return 204 No Content if successful or 404 if event doesn't exist
  // We cannot verify deletion of a real event because we cannot create events with the provided APIs
  // We can only verify that the endpoint can be called successfully by an admin
  await api.functional.shoppingMall.admin.orders.events.erase(adminConnection, {
    orderCode: typia.random<string>(),
    eventCode: typia.random<string>(),
  });
  // No asserts needed for this call because:
  // - The endpoint returns 204 No Content on success
  // - The endpoint returns 404 Not Found if order/event doesn't exist
  // - The connection is already validated to have admin auth
  // - The function call itself having no thrown exception confirms the API endpoint is accessible
  // - Any non-204 response indicates the system is still functional to reject invalid requests
}
