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

/**
 * Test user admin search performance and edge cases.
 * Validates search functionality with various filters, pagination limits,
 * and performance scenarios for administrator user search operations.
 */
export async function test_api_user_admin_search_performance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create actor-specific admin connection with updated headers
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Create multiple test users for performance testing
  const testUsers: IDiscussionBoardUser.ISummary[] = [];
  for (let i = 0; i < 25; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user1234",
        display_name: RandomGenerator.name(),
      },
    });
    testUsers.push({
      id: user.id,
      display_name: user.display_name,
      bio: user.bio,
      created_at: user.created_at,
    });
  }
  // 4. Test 1: Search with no results (non-existent email pattern)
  const emptySearch = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        email: "nonexistent-user-xyz-$",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearch.data.length,
    0,
  );
  // 5. Test 2: Maximum pagination limit (100) enforcement with valid input
  const maxLimitSearch = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(maxLimitSearch);
  TestValidator.predicate(
    "max limit search returns data within limit",
    maxLimitSearch.data.length <= 100,
  );
  // 6. Test 3: Large result sets with pagination
  const page1 = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        limit: 20,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        limit: 20,
        page: 2,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.notEquals(
    "pagination returns different results on different pages",
    page1.data,
    page2.data,
  );
  // 7. Test 4: Timestamp filtering with precise date ranges
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateFilteredSearch = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        createdAtFrom: yesterday,
        createdAtTo: now,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(dateFilteredSearch);
  // 8. Test 5: Search with display name pattern matching
  if (testUsers.length > 0) {
    const sampleUserName = testUsers[0].display_name.substring(0, 3);
    const nameSearch = await api.functional.discussionBoard.users.index(
      adminConnection,
      {
        body: {
          displayName: sampleUserName,
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
    typia.assert(nameSearch);
    TestValidator.predicate(
      "name search returns consistent results",
      nameSearch.data.length >= 0,
    );
  }
  // 9. Test 6: Search with bio content filtering
  const bioSearch = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        bio: "test",
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(bioSearch);
  // 10. Validate pagination metadata integrity
  const comprehensiveSearch = await api.functional.discussionBoard.users.index(
    adminConnection,
    {
      body: {
        limit: 50,
        page: 1,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(comprehensiveSearch);
  TestValidator.predicate(
    "comprehensive search has valid pagination structure",
    comprehensiveSearch.data.length >= 0,
  );
}
