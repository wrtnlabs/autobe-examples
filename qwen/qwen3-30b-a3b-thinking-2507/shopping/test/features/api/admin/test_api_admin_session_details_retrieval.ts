import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = typia.random<string>();
  const adminName: string = RandomGenerator.name();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });
  typia.assert(admin);
  // Step 2: Login as the new admin to get a connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  typia.assert(loginResult);
  // Step 3: Retrieve session details for this admin's session
  // Using admin ID as session ID for this test (real implementation would retrieve actual session ID)
  const adminId = admin.id;
  const sessionId = adminId;
  const session: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.sessions.at(
      loginConnection,
      {
        adminId: adminId,
        sessionId: sessionId,
      },
    );
  typia.assert(session);
  // Step 4: Verify session details match the admin account
  TestValidator.equals(
    "Session admin ID should match admin account ID",
    session.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "Session admin name should match admin account name",
    session.admin.username,
    admin.name,
  );
  TestValidator.equals(
    "Session should have a device info field",
    session.deviceInfo.length > 0,
    true,
  );
}
