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
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account using join operation (prerequisite)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const passwordForJoin = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: passwordForJoin,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Step 2: Use the created admin email and the original password to authenticate
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResult.email,
      password: passwordForJoin,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  // Step 3: Validate the returned admin profile and token structure
  TestValidator.equals(
    "admin email matches",
    adminLoginResult.email,
    adminJoinResult.email,
  );
  TestValidator.equals(
    "admin id is UUID",
    typia.is<string & tags.Format<"uuid">>(adminLoginResult.id),
    true,
  );
  TestValidator.equals(
    "adminType is defined",
    adminLoginResult.adminType === "regular" ||
      adminLoginResult.adminType === "super",
    true,
  );
  TestValidator.equals(
    "token access exists",
    typeof adminLoginResult.token.access === "string",
    true,
  );
  TestValidator.equals(
    "token refresh exists",
    typeof adminLoginResult.token.refresh === "string",
    true,
  );
  TestValidator.equals(
    "expired_at is correct format",
    typeof adminLoginResult.token.expired_at === "string",
    true,
  );
  TestValidator.equals(
    "refreshable_until is correct format",
    typeof adminLoginResult.token.refreshable_until === "string",
    true,
  );
}
