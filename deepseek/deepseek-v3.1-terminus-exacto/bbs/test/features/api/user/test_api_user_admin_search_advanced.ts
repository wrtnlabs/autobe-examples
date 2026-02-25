import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_admin_search_advanced(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create test users with varied data
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  const userEmails: string[] = [];
  const userDisplayNames: string[] = [];
  // Create users with different profiles
  for (let i = 0; i < 5; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const userEmail = `searchtest${i}@example.com`;
    const userDisplayName = `Search User ${i}`;
    const user = await authorize_user_join(userConnection, {
      body: {
        email: userEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: userDisplayName,
      },
    });
    users.push(user);
    userEmails.push(userEmail);
    userDisplayNames.push(userDisplayName);
  }
  // Wait a moment for all users to be created
  await new Promise((resolve) => setTimeout(resolve, 500));
  // Test 1: Search by partial email pattern
  const searchByEmail = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        email: "searchtest",
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(searchByEmail);
  TestValidator.predicate(
    "should find users with email containing 'searchtest'",
    searchByEmail.data.length >= 5,
  );
  // Test 2: Search by display name pattern
  const searchByName = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        displayName: "Search User",
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(searchByName);
  TestValidator.predicate(
    "should find users with display name containing 'Search User'",
    searchByName.data.length >= 5,
  );
  // Test 3: Search by specific email
  const specificEmailSearch = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        email: userEmails[0],
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(specificEmailSearch);
  TestValidator.predicate(
    "should find specific user by exact email",
    specificEmailSearch.data.length >= 1,
  );
  // Test 4: Test pagination with custom limit
  const searchWithPagination = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(searchWithPagination);
  TestValidator.predicate(
    "should respect page limit",
    searchWithPagination.data.length <= 3,
  );
  TestValidator.predicate(
    "should have valid pagination info",
    searchWithPagination.pagination.pagination.pagination.pagination.records >=
      0,
  );
  // Test 5: Test combined filters
  const combinedSearch = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        email: "searchtest",
        displayName: "Search User",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "should find users matching combined criteria",
    combinedSearch.data.length >= 5,
  );
  // Test 6: Verify user summary structure
  if (searchByEmail.data.length > 0) {
    const userSummary = searchByEmail.data[0];
    TestValidator.predicate(
      "user summary should have valid uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userSummary.id,
      ),
    );
    TestValidator.predicate(
      "user summary should have display_name",
      userSummary.display_name.length > 0,
    );
    TestValidator.predicate(
      "user summary should have valid created_at timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(userSummary.created_at),
    );
  }
  // Test 7: Search with date range (basic verification)
  const recentSearch = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        createdAtFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(recentSearch);
  TestValidator.predicate(
    "should find recently created users",
    recentSearch.data.length >= 5,
  );
}
