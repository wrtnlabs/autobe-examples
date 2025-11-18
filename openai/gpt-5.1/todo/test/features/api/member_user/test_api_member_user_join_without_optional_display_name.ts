import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that member user registration works correctly when the optional
 * display_name field is omitted from the join request.
 *
 * Business intent:
 *
 * - A guest should be able to register a new member account using only the
 *   required credentials and session metadata (email, password, href,
 *   referrer).
 * - The optional display_name profile field must not be required for account
 *   creation.
 * - The backend should still return a fully authorized context
 *   (ITodoAppMemberuser.IAuthorized) and issue tokens.
 * - In the authorized payload, display_name should either be absent (undefined)
 *   or explicitly null, but its absence must not affect usability.
 *
 * Test steps:
 *
 * 1. Build a join request body using ITodoAppMemberUserJoin.IRequest with:
 *
 *    - Email: random email string
 *    - Password: some non-empty string (server enforces actual complexity)
 *    - Href: random URL string
 *    - Referrer: random URL string
 *    - DO NOT set display_name at all
 *    - DO NOT set ip (allow server to derive it)
 * 2. Call api.functional.auth.memberUser.join(connection, { body }) and await
 *    result.
 * 3. Use typia.assert to validate that the response conforms to
 *    ITodoAppMemberuser.IAuthorized.
 * 4. Assert business conditions:
 *
 *    - Output.display_name is either undefined or null
 *    - Output.email equals the request email value
 *    - Critical identity fields are present: id, status, token, created_at,
 *         updated_at.
 *    - Token fields (access, refresh, expired_at, refreshable_until) are all present
 *         (no manual format checks required).
 * 5. Ensure that the test does not directly touch or inspect connection.headers.
 */
export async function test_api_member_user_join_without_optional_display_name(
  connection: api.IConnection,
) {
  // 1. Prepare registration payload without display_name and ip
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const body = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href,
    referrer,
    // display_name intentionally omitted
    // ip intentionally omitted
  } satisfies ITodoAppMemberUserJoin.IRequest;

  // 2. Call join endpoint
  const output: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body });

  // 3. Type-level validation of response structure
  typia.assert<ITodoAppMemberuser.IAuthorized>(output);

  // 4. Business assertions
  // 4-1. display_name should be undefined or null when it was omitted.
  TestValidator.predicate(
    "display_name should be undefined or null when omitted on join",
    output.display_name === undefined || output.display_name === null,
  );

  // 4-2. Response email must match request email.
  TestValidator.equals(
    "email in authorized context must match registration email",
    output.email,
    email,
  );

  // 4-3. Critical identity fields should be present (non-null / non-undefined) at runtime.
  TestValidator.predicate(
    "authorized context must have a non-empty member id",
    typeof output.id === "string" && output.id.length > 0,
  );

  TestValidator.predicate(
    "authorized context must have a non-empty status",
    typeof output.status === "string" && output.status.length > 0,
  );

  TestValidator.predicate(
    "authorized context must have created_at timestamp",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );

  TestValidator.predicate(
    "authorized context must have updated_at timestamp",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );

  // 4-4. Token object should be present with all fields populated.
  const token: IAuthorizationToken = output.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "token.access must be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "token.refresh must be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token.expired_at must be a non-empty string",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "token.refreshable_until must be a non-empty string",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  // 5. Do not touch connection.headers at all in this test. This is guaranteed
  //    by the absence of any such references in the implementation.
}
