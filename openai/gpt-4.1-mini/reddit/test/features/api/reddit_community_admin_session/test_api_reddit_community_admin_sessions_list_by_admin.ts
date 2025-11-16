import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdminSession";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

export async function test_api_reddit_community_admin_sessions_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin via auth/admin/join
  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@test.com",
        password: "password123",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create a new admin user record via redditCommunity admin create
  const adminCreate: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.create(
      connection,
      {
        body: {
          email: RandomGenerator.alphaNumeric(8) + "@example.com",
          password: "secretPass",
        } satisfies IRedditCommunityRedditCommunityAdmin.ICreate,
      },
    );
  typia.assert(adminCreate);

  // 3. Retrieve paginated list of admin sessions for the created admin
  const paginationBody = {
    page: 1,
    limit: 10,
    search: undefined,
    orderBy: "createdAt",
    orderDirection: "desc",
  } satisfies IRedditCommunityAdminSession.IRequest;

  const sessionsPage: IPageIRedditCommunityAdminSession.ISummary =
    await api.functional.redditCommunity.admin.redditCommunity.admins.adminSessions.index(
      connection,
      {
        id: adminCreate.id,
        body: paginationBody,
      },
    );
  typia.assert(sessionsPage);

  // Validations on pagination
  TestValidator.predicate(
    "pagination current is >= 0",
    sessionsPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is > 0",
    sessionsPage.pagination.limit > 0,
  );

  TestValidator.predicate(
    "records count is not negative",
    sessionsPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages count is not negative",
    sessionsPage.pagination.pages >= 0,
  );

  // Validate each session relates to the correct admin id
  for (const session of sessionsPage.data) {
    TestValidator.equals(
      "session admin ID should match",
      session.reddit_community_admin_id,
      adminCreate.id,
    );
  }
}
