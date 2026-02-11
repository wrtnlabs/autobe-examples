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
  // Create platform admin connection
  const platformAdminConnection: api.IConnection = { host: connection.host };
  // Generate credentials meeting complexity requirements
  // Password must include uppercase, lowercase, digit, and special character
  // Use typia.random with tag to ensure compliance, then satisfy the type
  const email = typia.random<string & tags.Format<"email">>();
  let password = typia.random<string & tags.MinLength<12>>();
  // Ensure password contains uppercase, lowercase, digit, and special character
  // We'll reconstruct if needed
  while (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    password = typia.random<string & tags.MinLength<12>>();
  }
  // Execute platform admin join
  const response: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: { email, password } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  // Validate response structure
  typia.assert(response);
  // Validate token fields
  TestValidator.equals(
    "access token should be non-empty",
    response.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token should be non-empty",
    response.refresh.length > 0,
    true,
  );
  TestValidator.predicate("expired_at should be valid ISO date-time", () => {
    const date = new Date(response.expired_at);
    return !isNaN(date.getTime()) && response.expired_at === date.toISOString();
  });
  // Validate authorization token structure
  typia.assert(response.token);
  TestValidator.equals(
    "token access should match response access",
    response.token.access,
    response.access,
  );
  TestValidator.equals(
    "token refresh should match response refresh",
    response.token.refresh,
    response.refresh,
  );
  TestValidator.equals(
    "token expired_at should match response expired_at",
    response.token.expired_at,
    response.expired_at,
  );
  // Validate refreshable_until field exists and is valid
  TestValidator.predicate(
    "refreshable_until should be valid ISO date-time",
    () => {
      const date = new Date(response.token.refreshable_until);
      return (
        !isNaN(date.getTime()) &&
        response.token.refreshable_until === date.toISOString()
      );
    },
  );
  // Verify JWT structure: three parts separated by dots (header.payload.signature)
  TestValidator.predicate("access token has JWT format", () => {
    const parts = response.access.split(".");
    return parts.length === 3 && parts.every((part) => part.length > 0);
  });
  TestValidator.predicate("refresh token has JWT format", () => {
    const parts = response.refresh.split(".");
    return parts.length === 3 && parts.every((part) => part.length > 0);
  });
}
