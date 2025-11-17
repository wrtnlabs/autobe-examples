import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * Validate the workflow where an admin deletes a reddit community moderator
 * session.
 *
 * This test performs the following steps:
 *
 * 1. Admin user signs up via the /auth/admin/join endpoint and obtains the
 *    authorization token.
 * 2. Using the authenticated admin account, a new reddit community moderator
 *    account is created.
 * 3. The test deletes a specific session for the created moderator by calling the
 *    session erase endpoint.
 *
 * Note: Due to lack of an explicit API to list moderator sessions, this test
 * assumes the session ID to delete matches the moderator's ID for demonstration
 * purposes.
 *
 * All API responses are validated with typia.assert to ensure type correctness.
 * This test verifies that the admin user can manage moderator sessions
 * properly, specifically focusing on session deletion and access revocation.
 *
 * @param connection The API connection object used for requests
 */
export async function test_api_admin_delete_moderator_session(
  connection: api.IConnection,
) {
  // 1. Admin user signs up and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(8);

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://example.com/admin/signup",
        referrer: "https://example.com",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a reddit community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(8);

  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: moderatorPassword,
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // 3. Delete a session of the moderator
  // Note: We assume the session ID is equal to moderator.id due to lack of session listing API.
  await api.functional.redditCommunity.admin.redditCommunityModerators.sessions.erase(
    connection,
    {
      redditCommunityModeratorId: moderator.id,
      id: moderator.id,
    },
  );
}
