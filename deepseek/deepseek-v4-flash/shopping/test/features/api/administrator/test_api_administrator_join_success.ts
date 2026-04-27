import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator account registration.
 *
 * Validates that a new administrator can register with valid credentials and session context, and that the response contains the correct identity details (email, grade, and active status) along with JWT token pair.
 *
 * 1. Prepare unique email, password, and session context fields.
 * 2. Register a new administrator using the authorize_administrator_join utility.
 * 3. Validate the full response structure with typia.assert.
 * 4. Verify business logic: email match, grade is "administrator", deleted_at is null, token strings are non-empty.
 */
export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register administrator via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const output = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(output);
  // Validate identity fields
  TestValidator.equals("email matches input", output.email, email);
  TestValidator.equals("grade is administrator", output.grade, "administrator");
  TestValidator.predicate(
    "deleted_at is null for active account",
    output.deleted_at === null,
  );
  // Validate token fields
  TestValidator.predicate(
    "access token is present",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    output.token.refresh.length > 0,
  );
}
