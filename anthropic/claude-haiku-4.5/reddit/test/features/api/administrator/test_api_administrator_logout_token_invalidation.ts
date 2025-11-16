import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_administrator_logout_token_invalidation(
  connection: api.IConnection,
) {
  // 1. Create administrator account with initial tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const authorized: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(authorized);

  // Verify tokens are present and valid
  TestValidator.predicate(
    "access token should be a non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be set",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration should be set",
    authorized.token.refreshable_until.length > 0,
  );

  // 2. Invoke logout endpoint to terminate the current session
  const logoutResponse: ICommunityPlatformAdministrator.ILogoutResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // 3. Verify logout response indicates successful session termination
  TestValidator.equals(
    "logout should return success status",
    logoutResponse.success,
    true,
  );
  TestValidator.predicate(
    "logout message should confirm session termination",
    logoutResponse.message.length > 0,
  );
}
