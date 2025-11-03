import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_admin_session_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication to receive token
  const adminCreateRequest = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityAdmin.ICreate;
  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateRequest,
    });
  typia.assert(authorizedAdmin);

  // Step 2: Create a new admin entity linked to the registered user
  const adminCreate: IRedditCommunityAdmin.ICreate = {
    user_id: authorizedAdmin.user_id,
  };
  const adminEntity: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.admins.create(connection, {
      body: adminCreate,
    });
  typia.assert(adminEntity);

  // Step 3: Create an admin session for this admin
  const sessionCreateRequest: IRedditCommunityAdminSession.ICreate = {
    ip: `192.168.${RandomGenerator.pick([0, 1, 2])}.${RandomGenerator.pick([10, 20, 30, 40, 50])}`,
    href: `https://example.com/dashboard/${RandomGenerator.alphaNumeric(5)}` satisfies string &
      tags.Format<"uri">,
    referrer: `https://example.com/home` satisfies string & tags.Format<"uri">,
  };
  const adminSession: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.admins.sessions.create(
      connection,
      {
        adminId: adminEntity.id,
        body: sessionCreateRequest,
      },
    );
  typia.assert(adminSession);

  // Step 4: Prepare update data for the admin session
  const expiredAtISOString = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const sessionUpdateRequest: IRedditCommunityAdminSession.IUpdate = {
    ip: `192.168.${RandomGenerator.pick([1, 3, 4])}.${RandomGenerator.pick([60, 70, 80])}`,
    href: `https://example.com/settings/${RandomGenerator.alphaNumeric(7)}`,
    referrer: `https://example.com/profile`,
    expired_at: expiredAtISOString,
  };

  // Step 5: Update the admin session
  const updatedSession: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.admins.sessions.updateSession(
      connection,
      {
        adminId: adminEntity.id,
        sessionId: adminSession.id,
        body: sessionUpdateRequest,
      },
    );
  typia.assert(updatedSession);

  // Step 6: Validate the updated admin session fields
  TestValidator.equals(
    "admin session id should match",
    updatedSession.id,
    adminSession.id,
  );
  TestValidator.equals(
    "admin id should match",
    updatedSession.reddit_community_admin_id,
    adminEntity.id,
  );
  TestValidator.equals(
    "IP address should be updated",
    updatedSession.ip,
    sessionUpdateRequest.ip,
  );
  TestValidator.equals(
    "href URL should be updated",
    updatedSession.href,
    sessionUpdateRequest.href,
  );
  TestValidator.equals(
    "referrer should be updated",
    updatedSession.referrer,
    sessionUpdateRequest.referrer,
  );

  // expired_at must be exactly the updated one (nullable)
  TestValidator.equals(
    "expired_at should be updated",
    updatedSession.expired_at,
    sessionUpdateRequest.expired_at,
  );

  // created_at must be a valid ISO 8601 datetime string (no change expected)
  typia.assert<string & tags.Format<"date-time">>(updatedSession.created_at);
}
