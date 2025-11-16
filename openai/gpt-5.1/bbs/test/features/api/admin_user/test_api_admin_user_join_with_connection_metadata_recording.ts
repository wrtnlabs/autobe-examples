import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Validate admin user join with connection metadata recording.
 *
 * Business goal
 *
 * - Ensure that POST /auth/adminUser/join correctly accepts connection metadata
 *   fields (ip, href, referrer) in IDiscussionBoardAdminUserJoin.IRequest while
 *   creating a new administrative user and issuing JWT tokens.
 * - Confirm that the join operation succeeds both when an IP is explicitly
 *   supplied and when it is omitted (allowing the backend to derive it).
 * - Verify that the SDK attaches the issued access token to
 *   connection.headers.Authorization as documented in the join()
 *   implementation.
 *
 * Scenario steps
 *
 * 1. Build a realistic IDiscussionBoardAdminUserJoin.IRequest payload with:
 *
 *    - Unique admin email (email format)
 *    - Strong-looking password (Format<"password"> string)
 *    - Display_name and optional bio
 *    - Valid absolute URIs for href and referrer
 *    - Explicit IPv4 string in ip for the first join attempt
 * 2. Call api.functional.auth.adminUser.join with the above payload.
 * 3. Assert that:
 *
 *    - The response conforms to IDiscussionBoardAdminuser.IAuthorized
 *    - Token is present and conforms to IAuthorizationToken
 *    - Connection.headers.Authorization has been populated to the access token
 * 4. Perform a second join attempt for another admin user where ip is omitted but
 *    href and referrer are still valid URIs. This validates that join does not
 *    require the ip field.
 * 5. Again assert that the response is a valid
 *    IDiscussionBoardAdminuser.IAuthorized and that
 *    connection.headers.Authorization has been set.
 */
export async function test_api_admin_user_join_with_connection_metadata_recording(
  connection: api.IConnection,
) {
  // Helper to build a realistic frontend URL
  const buildFrontendUrl = (path: string): string => {
    const host = "https://admin.discussion-board.example.com";
    return `${host}${path}`;
  };

  // 1. First admin: join with explicit IP address
  const firstEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const firstPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const firstRequestBody = {
    email: firstEmail,
    password: firstPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "203.0.113.42", // TEST-NET-3 example IPv4 address
    href: buildFrontendUrl("/onboarding/admin/join"),
    referrer: buildFrontendUrl("/landing"),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const firstAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: firstRequestBody,
    });

  // Ensure entire response structure is valid
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(firstAuthorized);
  // token must be present and structurally valid
  typia.assert<IAuthorizationToken>(firstAuthorized.token);

  // SDK should set Authorization header to the access token
  await TestValidator.predicate(
    "first join should set Authorization header",
    async () => {
      return (
        connection.headers !== undefined &&
        typeof connection.headers["Authorization"] === "string" &&
        connection.headers["Authorization"].length > 0 &&
        connection.headers["Authorization"] === firstAuthorized.token.access
      );
    },
  );

  // 2. Second admin: join without explicit IP (backend derives it)
  const secondEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const secondPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const secondRequestBody = {
    email: secondEmail,
    password: secondPassword,
    display_name: RandomGenerator.name(2),
    bio: null,
    // ip is intentionally omitted to verify it is optional
    href: buildFrontendUrl("/onboarding/admin/join"),
    referrer: buildFrontendUrl("/marketing/campaign-2025"),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const secondAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: secondRequestBody,
    });

  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(secondAuthorized);
  typia.assert<IAuthorizationToken>(secondAuthorized.token);

  // After second join, Authorization header must now reflect second token
  await TestValidator.predicate(
    "second join should update Authorization header to new access token",
    async () => {
      return (
        connection.headers !== undefined &&
        typeof connection.headers["Authorization"] === "string" &&
        connection.headers["Authorization"].length > 0 &&
        connection.headers["Authorization"] === secondAuthorized.token.access
      );
    },
  );

  // Basic logical cross-checks of response content
  TestValidator.equals(
    "first admin email in response should match request email",
    firstAuthorized.email,
    firstEmail,
  );
  TestValidator.equals(
    "second admin email in response should match request email",
    secondAuthorized.email,
    secondEmail,
  );

  TestValidator.predicate(
    "first admin ID should be a non-empty UUID string",
    () => firstAuthorized.id.length > 0,
  );
  TestValidator.predicate(
    "second admin ID should be a non-empty UUID string",
    () => secondAuthorized.id.length > 0,
  );
}
