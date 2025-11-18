import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";

/**
 * Verify that memberUser join accepts and persists an optional displayName.
 *
 * Business goal:
 *
 * - Ensure that when a client provides displayName in
 *   ITodoAppMemberUserJoin.ICreate, the backend stores it and returns it as
 *   display_name in ITodoAppMemberUser.IAuthorized.
 *
 * Scenario steps:
 *
 * 1. Build a join payload with:
 *
 *    - Email: unique, valid email (Format<"email">)
 *    - Password: any string satisfying Format<"password">
 *    - DisplayName: a non-empty human-friendly string
 *    - Ip: a valid IPv4 address (Format<"ipv4">)
 *    - Href: a valid URI of the signup page
 *    - Referrer: a valid URI of the previous page
 * 2. Call POST /auth/memberUser/join via api.functional.auth.memberUser.join.
 * 3. Assert that the response conforms to ITodoAppMemberUser.IAuthorized using
 *    typia.assert.
 * 4. Validate core business rules using TestValidator:
 *
 *    - Display_name in the response equals the provided displayName.
 *    - Email in the response equals the request email.
 *    - Token field exists and is structurally valid (validated by typia.assert).
 */
export async function test_api_member_user_join_with_optional_display_name(
  connection: api.IConnection,
) {
  // 1. Prepare join payload with optional displayName and other required fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name(2);
  const ip = "127.0.0.1" as string & tags.Format<"ipv4">;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const body = {
    email,
    password,
    displayName,
    ip,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  // 2. Call join endpoint
  const authorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body });

  // 3. Structural validation of response
  typia.assert<ITodoAppMemberUser.IAuthorized>(authorized);

  // 4. Business rule validations
  TestValidator.equals(
    "joined user email should match requested email",
    authorized.email,
    email,
  );

  TestValidator.equals(
    "joined user display_name should match provided displayName",
    authorized.display_name,
    displayName,
  );
}
