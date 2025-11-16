import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";

/**
 * Validate administrative audit details retrieval for a moderator session.
 *
 * This test verifies that, after administrator authentication, the admin can
 * retrieve a full audit record for a specific moderator session, using accurate
 * session and moderator UUIDs. It ensures:
 *
 * - Session audit metadata (IP, URLs, parent references, timestamps) is present
 *   and returns in the correct DTO structure
 * - All properties follow strict UUID and ISO 8601 date-time formats
 * - Moderator linkage record is present and accurate
 * - Results match type safety, and the scenario only tests permitted API/business
 *   logic (no type errors)
 *
 * Steps:
 *
 * 1. Administrator account is created and logged in
 * 2. Simulate or generate a random moderator session
 * 3. Use the session's moderatorId and sessionId to request session details via
 *    the session audit endpoint
 * 4. Assert that response matches ICommunityPlatformModeratorSession, with correct
 *    formats and values
 */
export async function test_api_moderator_session_details_audit_by_administrator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an administrator
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Simulate a valid moderator session for test inputs
  const session: ICommunityPlatformModeratorSession =
    typia.random<ICommunityPlatformModeratorSession>();
  typia.assert(session);

  // 3. Retrieve session details using the admin credential
  const response: ICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.administrator.moderators.sessions.at(
      connection,
      {
        moderatorId: session.community_platform_moderator_id,
        sessionId: session.id,
      },
    );
  typia.assert(response);

  // 4. Validate all required audit and linkage fields are correct types and non-empty
  TestValidator.equals("moderator session id matches", response.id, session.id);
  TestValidator.equals(
    "moderator parent reference matches",
    response.community_platform_moderator_id,
    session.community_platform_moderator_id,
  );
  TestValidator.equals(
    "moderator linkage record matches",
    response.moderator.id,
    session.moderator.id,
  );
  TestValidator.predicate(
    "session IP address present and non-empty",
    typeof response.ip === "string" && response.ip.length > 0,
  );
  TestValidator.predicate(
    "login href present and non-empty",
    typeof response.href === "string" && response.href.length > 0,
  );
  TestValidator.predicate(
    "referrer URL present and non-empty",
    typeof response.referrer === "string" && response.referrer.length > 0,
  );
  TestValidator.predicate(
    "session creation timestamp is ISO string",
    typeof response.created_at === "string" &&
      !!response.created_at.match(/T.*Z$/),
  );
  if (response.expired_at !== null && response.expired_at !== undefined) {
    TestValidator.predicate(
      "session expired_at is ISO string (nullable)",
      typeof response.expired_at === "string" &&
        !!response.expired_at.match(/T.*Z$/),
    );
  }
}
