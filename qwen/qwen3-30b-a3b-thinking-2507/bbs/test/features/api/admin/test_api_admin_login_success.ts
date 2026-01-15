import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account using join operation
  const joinConnection: api.IConnection = { host: connection.host };
  const newAdmin = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(newAdmin);
  // Step 2: Login with the new admin credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: {
      email: newAdmin.email,
      password: "P@ssw0rd123",
      ip: "127.0.0.1",
      href: "https://example.com/login",
      referrer: "https://example.com/dashboard",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Validate successful login conditions
  TestValidator.equals("admin ID matches", newAdmin.id, loginResponse.id);
  TestValidator.equals(
    "admin email matches",
    newAdmin.email,
    loginResponse.email,
  );
  TestValidator.equals(
    "admin status is active",
    loginResponse.status,
    "active",
  );
}
