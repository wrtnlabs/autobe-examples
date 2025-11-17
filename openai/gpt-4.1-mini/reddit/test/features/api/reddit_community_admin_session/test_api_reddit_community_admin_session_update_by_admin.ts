import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";

export async function test_api_reddit_community_admin_session_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin account creation via join for authentication
  const joinBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password: "Passw0rd!",
    href: `https://${RandomGenerator.alphaNumeric(8)}.com/join`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.com/landing`,
  } satisfies IRedditCommunityAdmin.IJoin;

  const joinResult: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joinResult);

  // 2. Create a Reddit Community Admin account
  const adminCreateBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminResult: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(adminResult);

  // 3. Create a new admin session
  const sessionCreateBody = {
    ip: `192.168.${RandomGenerator.alphaNumeric(2)
      .split("")
      .map((c) => c.charCodeAt(0) % 255)
      .join(".")}`,
    href: `https://${RandomGenerator.alphaNumeric(8)}.com/dashboard`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.com/home`,
    expired_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  } satisfies IRedditCommunityAdminSession.ICreate;

  const sessionResult: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.sessions.create(
      connection,
      { redditCommunityAdminId: adminResult.id, body: sessionCreateBody },
    );
  typia.assert(sessionResult);

  // 4. Update the created session with new connection details
  const sessionUpdateBody = {
    ip: `10.0.${RandomGenerator.alphaNumeric(2)
      .split("")
      .map((c) => c.charCodeAt(0) % 255)
      .join(".")}`,
    href: `https://${RandomGenerator.alphaNumeric(10)}.com/settings`,
    referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/profile`,
    expired_at: new Date(Date.now() + 7200 * 1000).toISOString(),
  } satisfies IRedditCommunityAdminSession.IUpdate;

  const updatedSessionResult: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.sessions.update(
      connection,
      {
        redditCommunityAdminId: adminResult.id,
        id: sessionResult.id,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSessionResult);

  // Validate that the id and redditCommunityAdminId are unchanged
  TestValidator.equals(
    "session id remains the same after update",
    updatedSessionResult.id,
    sessionResult.id,
  );
  TestValidator.equals(
    "admin id remains the same after update",
    updatedSessionResult.redditCommunityAdminId,
    adminResult.id,
  );

  // Validate that updated fields are changed as expected
  TestValidator.notEquals(
    "ip address is updated",
    updatedSessionResult.ip,
    sessionResult.ip,
  );
  TestValidator.notEquals(
    "href is updated",
    updatedSessionResult.href,
    sessionResult.href,
  );
  TestValidator.notEquals(
    "referrer is updated",
    updatedSessionResult.referrer,
    sessionResult.referrer,
  );
  TestValidator.notEquals(
    "expiration datetime is updated",
    updatedSessionResult.expiredAt,
    sessionResult.expiredAt,
  );
}
