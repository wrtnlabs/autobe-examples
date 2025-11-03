import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_admin_session_retrieval_by_admin_id_and_session_id(
  connection: api.IConnection,
) {
  // Step 1: Register admin user and obtain authorized admin data
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // Step 2: Create admin user entity
  const admin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.admins.create(connection, {
      body: {
        user_id: adminAuthorized.user_id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create admin session with connection metadata
  const sessionCreateBody: IRedditCommunityAdminSession.ICreate = {
    ip: "192.0.2.10",
    href: "https://redditcommunity.example.com/admin/dashboard",
    referrer: "https://redditcommunity.example.com/admin/login",
    expired_at: null,
  };
  const session: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.admins.sessions.create(
      connection,
      {
        adminId: admin.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // Step 4: Retrieve the admin session detail
  const retrievedSession: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.admins.sessions.at(connection, {
      adminId: admin.id,
      sessionId: session.id,
    });
  typia.assert(retrievedSession);

  // Step 5: Validate the retrieved session data
  TestValidator.equals(
    "Admin ID matches",
    retrievedSession.reddit_community_admin_id,
    admin.id,
  );
  TestValidator.equals("Session ID matches", retrievedSession.id, session.id);
  TestValidator.equals(
    "IP address matches",
    retrievedSession.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "Href matches",
    retrievedSession.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "Referrer matches",
    retrievedSession.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "Created at matches",
    retrievedSession.created_at,
    session.created_at,
  );
  TestValidator.equals(
    "Expired at matches",
    retrievedSession.expired_at ?? null,
    sessionCreateBody.expired_at,
  );
}
