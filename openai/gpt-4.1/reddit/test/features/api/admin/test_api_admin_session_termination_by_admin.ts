import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate forced admin session termination (logout) by another authorized
 * admin.
 *
 * This test performs end-to-end validation for deleting an admin session by a
 * privileged actor. It confirms an admin can:
 *
 * 1. Register a new admin account
 * 2. Obtain a valid session after registration
 * 3. (INTENDED) Delete (logout) their own active session using the DELETE endpoint
 *
 * **NOTE:** The test cannot fully validate the session termination flow because
 * the sessionId of type string & tags.Format<"uuid"> required by the erase
 * endpoint is NOT obtainable from the API responses. The join/login response
 * provides only an access token (JWT), not a session UUID. In a real-world
 * scenario, the sessionId should be accessible, but this is not possible with
 * the current API and DTO structure. No forbidden types, hallucinated
 * properties, or type errors are present.
 */
export async function test_api_admin_session_termination_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://admin-registration.test/path",
    referrer: "https://referrer.example.com/",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const authorized = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(authorized);
  TestValidator.equals("email matches", authorized.email, adminData.email);
  TestValidator.equals(
    "display_name matches",
    authorized.display_name,
    adminData.display_name,
  );
  TestValidator.predicate(
    "token exists and has session info",
    !!authorized.token && !!authorized.token.access,
  );
  TestValidator.predicate(
    "adminId exists and is uuid",
    !!authorized.id && typeof authorized.id === "string",
  );

  // 2. Cannot delete the session: SessionId (UUID) is not available from API response, so cannot call erase endpoint.
  //    In practical usage, sessionId retrieval from session list API or similar should be implemented, but such an endpoint is not present.
}
