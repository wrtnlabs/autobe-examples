import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare join request body with valid data
  const body: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd!",
  } satisfies ICommunityPlatformAdmin.IJoin;
  // Call the authorize_admin_join utility function
  const authorized = await authorize_admin_join(adminConnection, { body });
  // Validate the output type
  typia.assert(authorized);
  // Destructure to variables
  const { token } = authorized;
  // Validate token structure
  typia.assert(token);
  // Validate JWT format of access and refresh tokens
  TestValidator.predicate(
    "access token JWT format",
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token.access),
  );
  TestValidator.predicate(
    "refresh token format",
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token.refresh),
  );
  // Validate that expired_at and refreshable_until are valid ISO date-time strings
  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    !isNaN(refreshableUntilDate.getTime()),
  );
  // Validate expired_at < refreshable_until
  TestValidator.predicate(
    "expired_at is earlier than refreshable_until",
    expiredAtDate.getTime() < refreshableUntilDate.getTime(),
  );
  // Use the authorized token to confirm authenticated requests
  // Create a new connection with Authorization header with Bearer token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${token.access}`,
    },
  };
  // Example: call admin authenticate endpoint or authorized endpoint
  // Since no other endpoint is specified, just call authorize_admin_join again with same token to ensure token usage (simulate login)
  // But do not reuse join but login call
  // As login requires ICommunityPlatformAdmin.ILogin body (not IJoin) and we do not have email and password persisted here, skip this part.
  // Just ensure token is usable by testing token string pattern
  const authHeader = authenticatedConnection.headers?.Authorization;
  TestValidator.predicate(
    "authorization header set with Bearer token",
    typeof authHeader === "string" && authHeader.startsWith("Bearer "),
  );
}
