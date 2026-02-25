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

export async function test_api_admin_join_account_creation_flow(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection from base connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate test data for admin registration
  const joinBody: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    permissions_level: "full_access",
  } satisfies ICommunityPlatformAdmin.IJoin;
  // Execute admin registration
  const authorized = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  // Validate complete response structure
  typia.assert(authorized);
  // Verify all expected fields are present with correct values
  TestValidator.equals(
    "admin ID format validation",
    authorized.id,
    joinBody.email satisfies string as string,
  );
  TestValidator.equals("email matches input", authorized.email, joinBody.email);
  TestValidator.equals(
    "display name matches input",
    authorized.display_name,
    joinBody.display_name,
  );
  TestValidator.equals(
    "permissions level matches",
    authorized.permissions_level,
    joinBody.permissions_level ?? "standard",
  );
  // Verify account status fields
  TestValidator.predicate(
    "admin account is active",
    authorized.is_active === true,
  );
  // Verify timestamps are properly set
  TestValidator.predicate(
    "created at is valid date",
    new Date(authorized.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated at is valid date",
    new Date(authorized.updated_at).toString() !== "Invalid Date",
  );
  // Verify authorization token structure
  TestValidator.predicate(
    "token has access field",
    typeof authorized.token.access === "string",
  );
  TestValidator.predicate(
    "token has refresh field",
    typeof authorized.token.refresh === "string",
  );
  TestValidator.predicate(
    "access token expiration is valid",
    new Date(authorized.token.expired_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "refreshable until is valid",
    new Date(authorized.token.refreshable_until).toString() !== "Invalid Date",
  );
  // Verify token expiration times are in the future
  TestValidator.predicate(
    "access token expiration is in future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until is in future",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
  // Test that the authentication header was properly set
  TestValidator.predicate(
    "connection headers include authorization",
    adminConnection.headers?.Authorization !== undefined,
  );
}