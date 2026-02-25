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
  // Create a new connection for the admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data
  const joinInput: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    permissions_level: null,
  };
  // Register the admin account using the utility function
  const result = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  // Validate the response structure
  typia.assert(result);
  // Verify all required fields are present and correct
  TestValidator.equals("email matches input", result.email, joinInput.email);
  TestValidator.equals(
    "display_name matches input",
    result.display_name,
    joinInput.display_name,
  );
  TestValidator.predicate(
    "permissions_level is string",
    typeof result.permissions_level === "string",
  );
  TestValidator.predicate("is_active is true", result.is_active === true);
  TestValidator.predicate(
    "created_at is valid date",
    new Date(result.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(result.updated_at).getTime() > 0,
  );
  TestValidator.predicate("deleted_at is null", result.deleted_at === null);
  // Validate authorization token structure
  TestValidator.predicate(
    "access token exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    new Date(result.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    new Date(result.token.refreshable_until).getTime() > 0,
  );
  // Verify token expiration logic
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
