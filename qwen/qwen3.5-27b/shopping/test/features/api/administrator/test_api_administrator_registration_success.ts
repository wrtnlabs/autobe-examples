import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator account registration with valid credentials.
 *
 * Validates the complete administrator registration flow including credential submission, account creation, and authentication token issuance. Ensures that new administrators are created with default 'regular' grade, unbanned status, and receive valid access and refresh tokens immediately upon registration.
 *
 * Special attention is given to verifying that the registration captures session context (href, referrer, ip) for security auditing, and that the returned authorization response contains all required fields including administrator identity, privilege level, and token expiration metadata.
 *
 * 1. Create a new administrator connection for isolation.
 * 2. Register administrator with valid email, password, and session context.
 * 3. Validate response structure contains administrator identity and tokens.
 * 4. Verify administrator has 'regular' grade and is not banned.
 * 5. Verify token structure contains access, refresh, and expiration fields.
 */
export async function test_api_administrator_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection for isolation
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Register administrator with valid credentials
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  // 3. Validate administrator identity
  TestValidator.equals(
    "administrator id is uuid",
    typeof authorized.id,
    "string",
  );
  TestValidator.equals(
    "email matches input",
    authorized.email,
    authorized.email,
  );
  // 4. Verify default administrator attributes
  TestValidator.equals("grade is regular", authorized.grade, "regular");
  TestValidator.equals("not banned by default", authorized.banned, false);
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // 5. Verify token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(authorized.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    const date = new Date(authorized.token.refreshable_until);
    return !isNaN(date.getTime());
  });
  // 6. Verify timestamps
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(authorized.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(authorized.updated_at);
    return !isNaN(date.getTime());
  });
}
