import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

export async function test_api_admin_session_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create admin user account via auth/admin/join
  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create admin user via redditCommunity/admin/redditCommunity/admins
  const adminCreate: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(10),
        } satisfies IRedditCommunityRedditCommunityAdmin.ICreate,
      },
    );
  typia.assert(adminCreate);

  // 3. Create admin session for the created admin
  const sessionCreate: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunity.admins.adminSessions.create(
      connection,
      {
        adminId: adminCreate.id,
        body: {
          ip: RandomGenerator.pick(["192.168.0.1", "10.0.0.1", "172.16.0.1"]),
          href: "https://redditcommunity.example.com/admin/dashboard",
          referrer: "https://redditcommunity.example.com/admin/login",
          expiredAt: null,
        } satisfies IRedditCommunityAdminSession.ICreate,
      },
    );
  typia.assert(sessionCreate);

  // 4. Retrieve the admin session details
  const sessionDetail: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.redditCommunity.admins.adminSessions.getByIdAndSessionid(
      connection,
      {
        id: adminCreate.id,
        sessionId: sessionCreate.id,
      },
    );
  typia.assert(sessionDetail);

  // Validation: session's adminId matches the created admin id
  TestValidator.equals(
    "admin session's adminId matches created admin id",
    sessionDetail.adminId,
    adminCreate.id,
  );
  // Validation: session detail id matches created session id
  TestValidator.equals(
    "retrieved session id matches created session id",
    sessionDetail.id,
    sessionCreate.id,
  );
  // Validation: expiredAt is null as created
  TestValidator.equals(
    "session expiredAt is null",
    sessionDetail.expiredAt,
    null,
  );
}
