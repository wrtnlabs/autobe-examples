import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_admin_session_creation_by_admin_id(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorization and admin ID
  const createAdminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(createAdminAuthorized);

  // 2. Create admin user entity linked with the same user ID
  const createdAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.admins.create(connection, {
      body: {
        user_id: createAdminAuthorized.user_id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  TestValidator.equals(
    "Created admin user ID matches authorized user ID",
    createdAdmin.user_id,
    createAdminAuthorized.user_id,
  );

  // 3. Create a new admin session for the newly created admin
  const sessionBody = {
    ip: "192.168.1.1",
    href: "https://adminpanel.example.com/dashboard",
    referrer: "https://adminpanel.example.com/login",
    expired_at: null, // session has no expiration yet
  } satisfies IRedditCommunityAdminSession.ICreate;

  const session: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.admins.sessions.create(
      connection,
      {
        adminId: createdAdmin.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  TestValidator.equals(
    "Session admin ID matches created admin ID",
    session.reddit_community_admin_id,
    createdAdmin.id,
  );

  TestValidator.predicate(
    "Session created_at timestamp is a valid ISO date-time string",
    typeof session.created_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:.[0-9]+)?Z$/.test(
        session.created_at,
      ),
  );
  TestValidator.equals(
    "Session expired_at is null as expected",
    session.expired_at,
    null,
  );
}
