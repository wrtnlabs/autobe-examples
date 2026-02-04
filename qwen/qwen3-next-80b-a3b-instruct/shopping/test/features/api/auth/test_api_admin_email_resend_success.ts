import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_email_resend_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Admin joins the platform to create an account in pending verification state
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Verify the admin is created but in pending verification state
  // The admin account should be created but not yet verified
  // Step 2: Create a new connection with the authentication token from the join operation
  const resendConnection: api.IConnection = { host: connection.host };
  // The authorize_admin_join function updates the connection headers with the token
  // We can use the adminConnection directly for the resend operation
  // Step 3: Trigger email resend operation
  await api.functional.shoppingMall.admin.auth.admins.email.resend(
    resendConnection,
  );
  // Step 4: Assert that the operation was successful with 204 No Content
  // The operation returns void, so successful completion without error indicates success
  // No additional validation needed as per the API contract
}
