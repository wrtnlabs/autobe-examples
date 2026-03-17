import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member account registration with valid email, password, and display name.
 *
 * This test validates the primary registration workflow where a new user signs up
 * and gains immediate access to the application. The test verifies:
 * 1. Member can register with valid credentials (email, password, display_name)
 * 2. Response contains complete member identity information (id, email, display_name, created_at, updated_at)
 * 3. Response includes valid authorization token with access and refresh tokens
 * 4. Token expiration timestamps are properly set (expired_at, refreshable_until)
 * 5. Member data matches the input registration data
 * 6. Timestamps are valid and consistent (created_at equals updated_at for new account)
 * 7. New account has deleted_at as null (active account)
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Prepare unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(16);
  // Register new member with valid credentials
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: email,
      password: password,
      display_name: displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // Validate response structure with typia (complete type validation)
  typia.assert(authorized);
  // Verify member identity information matches input
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "display_name matches input",
    authorized.display_name,
    displayName,
  );
  // Verify account is active (not soft-deleted)
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deleted_at,
    null,
  );
  // Verify timestamps are valid and consistent for new account
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(authorized.updated_at)),
  );
  TestValidator.equals(
    "created_at equals updated_at for new account",
    authorized.created_at,
    authorized.updated_at,
  );
  // Verify authorization token has required fields
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  // Verify token expiration timestamps are in the future
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
  // Verify refresh token lifetime is longer than or equal to access token lifetime
  TestValidator.predicate(
    "refreshable_until is after or equal to expired_at",
    new Date(authorized.token.refreshable_until) >=
      new Date(authorized.token.expired_at),
  );
}
