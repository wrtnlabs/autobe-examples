import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate random credentials for the admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.name();
  // Register new admin account
  const registrationConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(registrationConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
    } satisfies ICommunityAdmin.IJoin,
  });
  // Log in with the newly created account
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityAdmin.IAuthorized = await authorize_admin_login(
    loginConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityAdmin.ILogin,
    },
  );
  // Validate response contains valid tokens
  typia.assert(authorized);
  // Validate token expiration (business logic, not type checking)
  TestValidator.predicate(
    "access token has not expired",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token has not expired",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
}
