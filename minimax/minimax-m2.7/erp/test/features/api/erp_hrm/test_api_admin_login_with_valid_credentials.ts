import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new administrator account with valid credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: "admin.login.valid@example.com" as string & tags.Format<"email">,
        display_name: "Valid Admin",
        password: "ValidPass123!",
        href: "/dashboard" as string & tags.Format<"uri">,
        referrer: "/login" as string & tags.Format<"uri">,
      } satisfies IErpHrmAdmin.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Attempt to login using the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse: IErpHrmAdmin.IAuthorized =
    await authorize_admin_login(loginConnection, {
      body: {
        email: "admin.login.valid@example.com" as string & tags.Format<"email">,
        password: "ValidPass123!" as string & tags.Format<"password">,
        href: "/dashboard" as string & tags.Format<"uri">,
        referrer: "/login" as string & tags.Format<"uri">,
      } satisfies IErpHrmAdmin.ILogin,
    });
  // 3. Validate the response
  typia.assert(loginResponse);
  // Verify admin profile data matches the created account
  TestValidator.equals(
    "email matches",
    loginResponse.email,
    "admin.login.valid@example.com",
  );
  TestValidator.equals(
    "display_name matches",
    loginResponse.display_name,
    "Valid Admin",
  );
  // Verify authorization token structure
  TestValidator.predicate(
    "has access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expired_at",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    loginResponse.token.refreshable_until.length > 0,
  );
}