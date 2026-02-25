import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platformadmin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const platformAdminConnection: api.IConnection = { host: connection.host };
  // Generate valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  // Execute platform admin join
  const response = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email,
        password,
        username,
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  // Validate response structure and types
  typia.assert(response);
  // Verify fields match expected patterns
  TestValidator.equals("email matches", response.email, email);
  TestValidator.equals("username matches", response.username, username);
  TestValidator.predicate("karma is zero", response.karma_score === 0);
  TestValidator.predicate("is_deleted is false", response.is_deleted === false);
  TestValidator.predicate("access token exists", response.access.length > 0);
  TestValidator.predicate("refresh token exists", response.refresh.length > 0);
  TestValidator.predicate("token exists", response.token.access.length > 0);
  TestValidator.predicate(
    "token refreshable_until is future",
    new Date(response.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "token expired_at is future",
    new Date(response.token.expired_at) > new Date(),
  );
  // Validate token claims indirectly through response properties
  // Since tokens are JWT and signed, their claims are verified by the framework's token parser
  // and we can trust the response structure as validated by typia.assert() above
}
