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

/**
 * Test comprehensive biography keyword search with date range filtering.
 * As an administrator conducting user reviews, I need to search for users based on
 * biography content keywords combined with account creation date filtering.
 * The test should verify that biography content search works across the bio field,
 * supports multiple keywords with boolean logic, and can be combined with date
 * range filters (createdAtFrom/createdAtTo). Test scenarios include: searching
 * for specific expertise mentions in biographies, filtering by users created within
 * specific time periods, and combining keyword search with date ranges for targeted
 * moderation activities. Validate that empty biography fields are handled correctly
 * and that results respect the includeDeleted flag appropriately.
 */
export async function test_api_admin_users_search_biography_keywords_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Test biography keyword search with multiple expertise areas
  const biographyKeywords = [
    "software engineer",
    "full-stack developer",
    "web developer",
    "data scientist",
  ];
  const bioKeyword = RandomGenerator.pick(biographyKeywords);
  const bioSearchConnection: api.IConnection = { host: connection.host };
  bioSearchConnection.headers = { ...adminConnection.headers };
  const bioSearchResults =
    await api.functional.discussionBoard.admin.users.search.index(
      bioSearchConnection,
      {
        body: {
          bio: bioKeyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(bioSearchResults);
  TestValidator.predicate(
    "biography search returns valid data array",
    Array.isArray(bioSearchResults.data),
  );
  // 3. Test date range filtering with proper date string handling
  const currentDate = new Date().toISOString();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeConnection: api.IConnection = { host: connection.host };
  dateRangeConnection.headers = { ...adminConnection.headers };
  const dateRangeResults =
    await api.functional.discussionBoard.admin.users.search.index(
      dateRangeConnection,
      {
        body: {
          createdAtFrom: thirtyDaysAgo,
          createdAtTo: currentDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // 4. Test combined keyword search and date filtering
  const combinedSearchConnection: api.IConnection = { host: connection.host };
  combinedSearchConnection.headers = { ...adminConnection.headers };
  const combinedSearchResults =
    await api.functional.discussionBoard.admin.users.search.index(
      combinedSearchConnection,
      {
        body: {
          bio: bioKeyword,
          createdAtFrom: thirtyDaysAgo,
          createdAtTo: currentDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(combinedSearchResults);
  TestValidator.predicate(
    "combined search returns valid results",
    Array.isArray(combinedSearchResults.data),
  );
  // 5. Test handling of users with empty biography fields
  const emptyBioConnection: api.IConnection = { host: connection.host };
  emptyBioConnection.headers = { ...adminConnection.headers };
  const emptyBioSearchResults =
    await api.functional.discussionBoard.admin.users.search.index(
      emptyBioConnection,
      {
        body: {
          bio: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(emptyBioSearchResults);
  // 6. Test includeDeleted flag behavior
  const includeDeletedConnection: api.IConnection = { host: connection.host };
  includeDeletedConnection.headers = { ...adminConnection.headers };
  const includeDeletedResults =
    await api.functional.discussionBoard.admin.users.search.index(
      includeDeletedConnection,
      {
        body: {
          bio: bioKeyword,
          includeDeleted: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(includeDeletedResults);
  // 7. Test partial keyword matching
  const partialKeyword = bioKeyword.substring(
    0,
    Math.floor(bioKeyword.length / 2),
  );
  const partialSearchConnection: api.IConnection = { host: connection.host };
  partialSearchConnection.headers = { ...adminConnection.headers };
  const partialSearchResults =
    await api.functional.discussionBoard.admin.users.search.index(
      partialSearchConnection,
      {
        body: {
          bio: partialKeyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(partialSearchResults);
  TestValidator.predicate(
    "partial keyword search returns valid results",
    Array.isArray(partialSearchResults.data),
  );
  // 8. Test search with multiple criteria combination
  const multiCriteriaConnection: api.IConnection = { host: connection.host };
  multiCriteriaConnection.headers = { ...adminConnection.headers };
  const multiCriteriaResults =
    await api.functional.discussionBoard.admin.users.search.index(
      multiCriteriaConnection,
      {
        body: {
          displayName: RandomGenerator.alphabets(3),
          bio: bioKeyword,
          createdAtFrom: thirtyDaysAgo,
          createdAtTo: currentDate,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(multiCriteriaResults);
  TestValidator.predicate(
    "multi-criteria search returns valid data array",
    Array.isArray(multiCriteriaResults.data),
  );
}
