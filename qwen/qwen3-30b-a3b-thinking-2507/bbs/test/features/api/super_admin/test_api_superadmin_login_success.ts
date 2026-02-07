import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Verifies successful login with credentials of a newly created super administrator account. User joins as super admin to create a new account, then logs in using the same credentials to obtain authentication tokens for API access. Confirms that token generation includes valid access token, refresh token, expiration timestamps, and user identity information matching the created account.
  // 1. Create new super admin account
  const joinConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const user = await authorize_super_admin_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IEconomyPoliticsBoardSuperAdmin.IJoin,
  });
  // 2. Use same credentials to login
  const loginConnection = { host: connection.host };
  const loginResponse = await authorize_super_admin_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IEconomyPoliticsBoardSuperAdmin.ILogin,
  });
  // 3. Validate login response
  typia.assert(loginResponse);
  TestValidator.equals("User ID matches", loginResponse.id, user.id);
  TestValidator.equals("Email matches", loginResponse.email, user.email);
  TestValidator.predicate("Token is valid", loginResponse.token.access !== "");
  TestValidator.predicate(
    "Refresh token is valid",
    loginResponse.token.refresh !== "",
  );
  TestValidator.predicate(
    "Access token expires in future",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
}
