import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";

/**
 * Validate that an admin can register and log in, with correct account and
 * session context.
 *
 * This test registers a new admin account and logs in as that admin, ensuring
 * successful authentication flows. The session detail retrieval step is omitted
 * because the login API does not expose a valid sessionId; as such, fetching
 * the session context for that session is not technically possible in this test
 * until the API evolves to return the session id.
 *
 * Steps:
 *
 * 1. Register a new admin (join)
 * 2. Log in as that admin (login) to create a session
 * 3. (Omitted: Session detail retrieval, pending API response with sessionId in
 *    IAuthorized)
 */
export async function test_api_admin_session_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const registrationHref = "https://admin-portal.example.com/register";
  const registrationReferrer = "https://admin-portal.example.com/landing";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      href: registrationHref,
      referrer: registrationReferrer,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Step 2: Log in as that admin to create a session
  const loginHref = "https://admin-portal.example.com/dashboard";
  const loginReferrer = "https://admin-portal.example.com/register";
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email,
      password,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // Session detail retrieval for this admin's session is not implemented due to API limitations.
}
