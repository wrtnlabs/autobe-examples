import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_super_join_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for super administrator registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSuperAdministrator.IJoin;
  // Execute the join operation
  const response = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: registrationData,
    },
  );
  // Validate the response structure using typia (this performs complete validation)
  typia.assert(response);
  // Verify account information matches registration data
  TestValidator.equals(
    "email should match",
    response.email,
    registrationData.email,
  );
  TestValidator.predicate(
    "created_at should be recent",
    new Date(response.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated_at should be recent",
    new Date(response.updated_at) <= new Date(),
  );
  TestValidator.equals(
    "deleted_at should be null for new account",
    response.deleted_at,
    null,
  );
  // Validate token structure (typia.assert already validated complete structure)
  TestValidator.predicate(
    "expired_at should be future date",
    new Date(response.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be future date",
    new Date(response.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be later than expired_at",
    new Date(response.token.refreshable_until) >
      new Date(response.token.expired_at),
  );
  // Verify the authorization header was set on the connection
  TestValidator.equals(
    "authorization header should be set",
    typeof superAdminConnection.headers?.Authorization,
    "string",
  );
  TestValidator.equals(
    "authorization header should match access token",
    superAdminConnection.headers?.Authorization,
    `Bearer ${response.token.access}`,
  );
}
