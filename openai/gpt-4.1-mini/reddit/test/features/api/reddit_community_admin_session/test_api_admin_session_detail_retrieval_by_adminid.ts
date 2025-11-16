import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

export async function test_api_admin_session_detail_retrieval_by_adminid(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin user account via join API
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "TestPassword123!",
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuth);

  // Step 2: Create a new admin user via redditCommunity.admin.redditCommunity.admins.create
  const adminCreateBody2 = {
    email: adminAuth.email, // Use the same email to simulate that admin is created
    password: "TestPassword123!",
  } satisfies IRedditCommunityRedditCommunityAdmin.ICreate;

  // Because the real create might require unique email, so generate another to create a real admin
  const adminCreateReal = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "TestPassword123!",
  } satisfies IRedditCommunityRedditCommunityAdmin.ICreate;

  const adminCreated: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.create(
      connection,
      { body: adminCreateReal },
    );
  typia.assert(adminCreated);

  // Step 3: Create a new admin session associated with the created admin
  const sessionCreateBody = {
    ip: "192.168.1.1",
    href: "/admin/dashboard",
    referrer: "/admin/login",
  } satisfies IRedditCommunityAdminSession.ICreate;

  const adminSession: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunity.admins.adminSessions.create(
      connection,
      {
        adminId: adminCreated.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(adminSession);

  // Step 4: Retrieve the detailed information of the admin session
  const adminSessionDetail: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunity.admins.adminSessions.getByAdminidAndSessionid(
      connection,
      {
        adminId: adminCreated.id,
        sessionId: adminSession.id,
      },
    );

  typia.assert(adminSessionDetail);

  // Step 5: Assertions
  TestValidator.equals(
    "admin id matches",
    adminSessionDetail.adminId,
    adminCreated.id,
  );
  TestValidator.equals(
    "session id matches",
    adminSessionDetail.id,
    adminSession.id,
  );
  TestValidator.equals(
    "ip matches",
    adminSessionDetail.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "href matches",
    adminSessionDetail.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "referrer matches",
    adminSessionDetail.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.predicate(
    "createdAt exists",
    typeof adminSessionDetail.createdAt === "string",
  );
}
