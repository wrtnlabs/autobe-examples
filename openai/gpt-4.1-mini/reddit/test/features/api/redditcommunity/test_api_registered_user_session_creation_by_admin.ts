import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";

export async function test_api_registered_user_session_creation_by_admin(
  connection: api.IConnection,
) {
  // 0. Admin join to create authentication context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "strongPassword123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 1. Registered user id to create session for
  const registeredUserId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a registered user session
  const sessionCreateBody = {
    sessionToken: RandomGenerator.alphaNumeric(64),
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    ipAddress: typia.random<string & tags.Format<"ipv4">>(),
    userAgent: `Mozilla/5.0 (windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${RandomGenerator.alphabets(2)}.0.${RandomGenerator.alphaNumeric(4)}.100 Safari/537.36`,
    referer: `https://${RandomGenerator.alphaNumeric(8)}.com/path/page.html`,
  } satisfies IRedditCommunityRegisteredUserSession.ICreate;

  const session: IRedditCommunityRegisteredUserSession =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.create(
      connection,
      {
        id: registeredUserId,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // Validate created session correctness
  TestValidator.equals("user id match", session.user_id, registeredUserId);
  TestValidator.predicate("session token length", session.token.length >= 64);
  TestValidator.predicate(
    "expiration is valid ISO 8601",
    typeof session.expires_at === "string" && session.expires_at.length > 0,
  );
  TestValidator.predicate("session is active", session.is_active === true);
}
