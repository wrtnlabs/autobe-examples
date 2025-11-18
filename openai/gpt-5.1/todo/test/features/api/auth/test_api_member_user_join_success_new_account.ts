import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Verify successful registration of a new member user and initial authorized
 * context.
 *
 * Business goal:
 *
 * - Ensure that a guest can register a brand new member account using POST
 *   /auth/memberUser/join
 * - Ensure that the backend returns a fully-populated
 *   ITodoAppMemberuser.IAuthorized context
 * - Ensure that no password-related fields are exposed in the response (enforced
 *   structurally by DTO)
 *
 * Test steps:
 *
 * 1. Construct a valid ITodoAppMemberUserJoin.IRequest payload:
 *
 *    - Email: random RFC-compliant email
 *    - Password: random string matching tags.Format<"password"> (typia.random will
 *         respect tags)
 *    - Display_name: optional human-friendly name string
 *    - Ip: omit to let server infer from connection (allowed: ip is optional and
 *         nullable)
 *    - Href: random valid URL indicating current page
 *    - Referrer: random valid URL indicating previous page
 * 2. Call api.functional.auth.memberUser.join with the constructed body.
 * 3. Assert that the response conforms to ITodoAppMemberuser.IAuthorized via
 *    typia.assert.
 * 4. Validate core identity fields:
 *
 *    - Id is a non-empty UUID string (basic non-empty check; full type validated by
 *         typia.assert)
 *    - Email matches the request email
 *    - Display_name matches the requested display_name (when present)
 * 5. Validate token structure:
 *
 *    - Token.access and token.refresh are non-empty strings
 *    - Token.expired_at and token.refreshable_until are ISO 8601 date-time strings
 *         (structurally validated by typia.assert)
 *
 * Error scenarios around duplicate email, invalid password, or malformed URLs
 * are intentionally not covered in this happy-path test.
 */
export async function test_api_member_user_join_success_new_account(
  connection: api.IConnection,
) {
  // 1. Prepare a valid registration payload
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const displayName: string = RandomGenerator.name();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const body = {
    email,
    password,
    display_name: displayName,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  // 2. Call registration endpoint as guest (no prior Authorization header required)
  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body });

  // 3. Type-level assertion that response matches ITodoAppMemberuser.IAuthorized
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 4. Validate core identity fields
  TestValidator.equals(
    "member email should match registration email",
    authorized.email,
    email,
  );

  TestValidator.predicate(
    "member id should be non-empty UUID string",
    () => authorized.id.length > 0,
  );

  // display_name is optional | null | undefined; only assert when we provided one
  if (
    authorized.display_name !== null &&
    authorized.display_name !== undefined
  ) {
    TestValidator.equals(
      "display_name should match requested displayName when present",
      authorized.display_name,
      displayName,
    );
  }

  // 5. Validate token structure
  const token = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token should be non-empty string",
    () => token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    () => token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at should be a non-empty ISO date-time string",
    () => token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until should be a non-empty ISO date-time string",
    () => token.refreshable_until.length > 0,
  );
}
