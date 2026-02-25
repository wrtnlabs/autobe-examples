import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_registration_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid administrator registration data
  const joinBody: IEcommerceAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // Register the administrator account using the utility function
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  // Validate the complete authentication response
  typia.assert(authorizedAdmin);
  // Verify administrator identity fields
  TestValidator.equals(
    "email matches input",
    authorizedAdmin.email,
    joinBody.email,
  );
  // Verify timestamps are properly set and valid
  const now = new Date().getTime();
  const createdAt = new Date(authorizedAdmin.created_at).getTime();
  const updatedAt = new Date(authorizedAdmin.updated_at).getTime();
  const expiredAt = new Date(authorizedAdmin.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorizedAdmin.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "created_at is recent",
    Math.abs(now - createdAt) < 60000,
  ); // Within 1 minute
  TestValidator.predicate(
    "updated_at is recent",
    Math.abs(now - updatedAt) < 60000,
  ); // Within 1 minute
  TestValidator.equals("deleted_at is null", authorizedAdmin.deleted_at, null);
  // Validate token timing relationships
  TestValidator.predicate("token.expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "token.refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Verify token headers are set on the connection
  TestValidator.predicate(
    "Authorization header is set",
    adminConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header contains access token",
    adminConnection.headers?.Authorization,
    `Bearer ${authorizedAdmin.token.access}`,
  );
  // Verify administrator connection is properly authorized
  TestValidator.predicate(
    "administrator connection is authorized",
    typeof adminConnection.headers?.Authorization === "string" &&
      adminConnection.headers.Authorization.startsWith("Bearer"),
  );
}