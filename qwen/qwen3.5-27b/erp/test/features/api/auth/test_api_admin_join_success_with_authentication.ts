import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator account registration with authentication.
 *
 * This test validates the primary success path for creating a new administrator
 * account in the HRM Platform. It verifies that:
 * - A new admin account is created with unique credentials
 * - The response contains valid authorization tokens
 * - The connection is automatically authenticated with the access token
 * - All response fields are correctly typed and formatted
 */
export async function test_api_admin_join_success_with_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate input data
  const inputEmail = typia.random<string & tags.Format<"email">>();
  // Register a new administrator using the utility function
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: inputEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // Validate the entire response structure (includes all type/format validations)
  typia.assert(authorized);
  // Verify business logic: email matches input
  TestValidator.equals("email matches input", authorized.email, inputEmail);
  // Verify business logic: tokens are non-empty
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // Verify business logic: connection was automatically authenticated
  TestValidator.predicate(
    "connection has Authorization header",
    adminConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    adminConnection.headers?.Authorization,
    authorized.token.access,
  );
}
