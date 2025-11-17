import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";

export async function test_api_reddit_community_admin_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join to authenticate and get authorization token
  const adminJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://referrer.example.com/",
  } satisfies IRedditCommunityAdmin.IJoin;
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a Reddit Community Administrator entity
  const adminCreateBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IRedditCommunityAdmin.ICreate;
  const redditAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
      connection,
      {
        body: adminCreateBody,
      },
    );
  typia.assert(redditAdmin);

  // 3. Create an admin session for the created Reddit Community Administrator
  const nowISOString = new Date().toISOString();
  const expireISOString = new Date(Date.now() + 3600 * 1000).toISOString();
  const sessionCreateBody = {
    ip: "127.0.0.1",
    href: "https://example.com/admin/dashboard",
    referrer: "https://example.com/login",
    expired_at: expireISOString,
  } satisfies IRedditCommunityAdminSession.ICreate;
  const sessionCreated: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.sessions.create(
      connection,
      {
        redditCommunityAdminId: redditAdmin.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(sessionCreated);

  // 4. Retrieve detailed info of the created session by its ID
  const sessionRetrieved: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.sessions.at(
      connection,
      {
        redditCommunityAdminId: redditAdmin.id,
        id: sessionCreated.id,
      },
    );
  typia.assert(sessionRetrieved);

  // Validate returned session info matches creation info
  TestValidator.equals(
    "session id matches",
    sessionRetrieved.id,
    sessionCreated.id,
  );
  TestValidator.equals(
    "session redditCommunityAdminId matches",
    sessionRetrieved.redditCommunityAdminId,
    redditAdmin.id,
  );
  TestValidator.equals(
    "session IP matches",
    sessionRetrieved.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "session href matches",
    sessionRetrieved.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "session referrer matches",
    sessionRetrieved.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "session createdAt is valid ISO date-time",
    typeof sessionRetrieved.createdAt === "string" &&
      sessionRetrieved.createdAt.length > 0,
    true,
  );
  TestValidator.equals(
    "session expiredAt matches",
    sessionRetrieved.expiredAt,
    sessionCreateBody.expired_at,
  );
}
