import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";

/**
 * Test the complete workflow of an admin deleting an existing session linked to
 * their Reddit Community Admin account. The test begins with authenticating as
 * a new admin via the join operation to establish a fresh user context. After
 * creating the admin user, the admin creates a new session for which deletion
 * will be tested. The scenario ensures that only authorized admins can delete
 * sessions and verifies that the session is fully removed from the system upon
 * successful deletion. This validates secure session termination and audit
 * consistency.
 */
export async function test_api_reddit_community_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as new admin using join
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityAdmin.IJoin;
  const joinResult: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinResult);

  // 2. Use the token of the joined admin to create Reddit Community Admin account
  //    But since join returns authorized admin with token, this join admin can create itself? No, join creates admin already authorized
  //    But the dependency says we must create a RedditCommunityAdmin separately
  //    However IRedditCommunityAdmin.ICreate requires email and password.
  //    The admin id is given by joinResult.id. The join email and password are known.
  //    To follow the scenario, let's create a new admin account for clarity.

  // Creating a separate admin account with a different email
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityAdmin.ICreate;
  const createdAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(createdAdmin);

  // 3. Create a new session for the created admin
  const now = new Date();
  const expiredAt = new Date(now.getTime() + 3600 * 1000).toISOString(); // expires in 1 hour

  // Construct required fields for IRedditCommunityAdminSession.ICreate
  const sessionCreateBody = {
    ip: `${RandomGenerator.alphabets(3)}.${RandomGenerator.alphabets(3)}.${RandomGenerator.alphabets(3)}.${RandomGenerator.alphabets(3)}`,
    href: "https://example.com/sessions/new",
    referrer: "https://example.com/login",
    expired_at: expiredAt,
  } satisfies IRedditCommunityAdminSession.ICreate;

  const createdSession: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.sessions.create(
      connection,
      {
        redditCommunityAdminId: createdAdmin.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // 4. Delete the session
  await api.functional.redditCommunity.admin.redditCommunityAdmins.sessions.erase(
    connection,
    {
      redditCommunityAdminId: createdAdmin.id,
      id: createdSession.id,
    },
  );
}
