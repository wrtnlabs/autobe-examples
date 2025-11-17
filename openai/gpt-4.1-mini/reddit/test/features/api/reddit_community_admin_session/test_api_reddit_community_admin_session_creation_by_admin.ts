import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";

export async function test_api_reddit_community_admin_session_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin by join operation
  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: `https://${RandomGenerator.alphaNumeric(10)}.com/`,
        referrer: `https://${RandomGenerator.alphaNumeric(8)}.com/`,
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(adminAuth);

  // 2. Create a Reddit Community Administrator account
  const admin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "StrongPassword123!",
        } satisfies IRedditCommunityAdmin.ICreate,
      },
    );
  typia.assert(admin);

  // 3. Create a new admin session for the created admin
  //    Provide realistic IP, href, referrer, and expiration timestamp
  const now = new Date();
  const expiration = new Date(now.getTime() + 3600000); // expires in 1 hour
  const sessionBody = {
    ip: `${RandomGenerator.alphaNumeric(3)}.${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(2)}.${RandomGenerator.alphaNumeric(2)}`,
    href: `https://${RandomGenerator.alphaNumeric(10)}.com/admin/session`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.com/admin/login`,
    expired_at: expiration.toISOString(),
  } satisfies IRedditCommunityAdminSession.ICreate;

  const session: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.sessions.create(
      connection,
      {
        redditCommunityAdminId: admin.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  // Verify the session is linked to the correct admin
  TestValidator.equals(
    "Session linked redditCommunityAdminId matches created admin id",
    session.redditCommunityAdminId,
    admin.id,
  );

  // Verify id is a UUID
  TestValidator.predicate(
    "session id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      session.id,
    ),
  );

  // Verify timestamps are ISO strings
  TestValidator.predicate(
    "createdAt is ISO date-time string",
    !isNaN(Date.parse(session.createdAt)),
  );
  if (session.expiredAt !== null) {
    TestValidator.predicate(
      "expiredAt is ISO date-time string",
      !isNaN(Date.parse(session.expiredAt)),
    );
  }
}
