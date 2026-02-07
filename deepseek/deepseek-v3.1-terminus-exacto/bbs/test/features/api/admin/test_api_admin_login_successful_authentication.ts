import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_successful_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator account first using join utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Test login with the created credentials using login utility function
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: "TestPassword123!",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Validate response structure - focus on business logic validation
  TestValidator.equals("admin ID matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinResult.email);
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.predicate(
    "access token is generated",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is generated",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is in future",
    new Date(loginResult.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh deadline is in future",
    new Date(loginResult.token.refreshable_until).getTime() > Date.now(),
  );
}
