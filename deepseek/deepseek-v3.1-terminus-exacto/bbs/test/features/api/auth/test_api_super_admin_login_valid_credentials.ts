import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create predefined credentials that we control for both join and login
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  // Create super admin account with known credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_super_admin_join(adminConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // Test login with the same credentials used for join
  const loginResponse = await authorize_super_admin_login(adminConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(loginResponse);
  // Validate response structure and token properties
  TestValidator.predicate(
    "response should have id",
    loginResponse.id !== undefined,
  );
  TestValidator.equals("email should match", loginResponse.email, testEmail);
  TestValidator.predicate(
    "token should have access property",
    loginResponse.token.access !== undefined,
  );
  TestValidator.predicate(
    "token should have refresh property",
    loginResponse.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "token should have expiration dates",
    loginResponse.token.expired_at !== undefined &&
      loginResponse.token.refreshable_until !== undefined,
  );
  // Validate token expiration dates are in the future
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  const currentTime = new Date();
  TestValidator.predicate(
    "access token should expire in the future",
    expiredAt > currentTime,
  );
  TestValidator.predicate(
    "refresh token should expire later than access token",
    refreshableUntil > expiredAt,
  );
}
