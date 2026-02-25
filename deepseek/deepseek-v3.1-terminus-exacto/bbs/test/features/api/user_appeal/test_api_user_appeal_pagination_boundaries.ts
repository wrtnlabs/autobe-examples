import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_appeal_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: Cannot create ban appeals through available API, so we test with existing data
  // Test pagination boundaries with various parameters
  // Test first page
  const firstPage = await api.functional.discussionBoard.user.appeals.my.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Test middle page
  const middlePage = await api.functional.discussionBoard.user.appeals.my.index(
    userConnection,
    {
      body: {
        page: 3,
        limit: 10,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    },
  );
  typia.assert(middlePage);
  TestValidator.equals(
    "middle page current page",
    middlePage.pagination.pagination.pagination.pagination.current,
    3,
  );
  TestValidator.equals(
    "middle page limit",
    middlePage.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "middle page records non-negative",
    middlePage.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "middle page pages non-negative",
    middlePage.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Test page exceeding total pages
  const outOfBoundsPage =
    await api.functional.discussionBoard.user.appeals.my.index(userConnection, {
      body: {
        page: 100,
        limit: 10,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(outOfBoundsPage);
  TestValidator.equals(
    "out of bounds page current page",
    outOfBoundsPage.pagination.pagination.pagination.pagination.current,
    100,
  );
  TestValidator.equals(
    "out of bounds page limit",
    outOfBoundsPage.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "out of bounds page records non-negative",
    outOfBoundsPage.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "out of bounds page pages non-negative",
    outOfBoundsPage.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Test minimum limit
  const minLimitPage =
    await api.functional.discussionBoard.user.appeals.my.index(userConnection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(minLimitPage);
  TestValidator.equals(
    "min limit page current page",
    minLimitPage.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "min limit page limit",
    minLimitPage.pagination.pagination.pagination.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit page records non-negative",
    minLimitPage.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "min limit page pages non-negative",
    minLimitPage.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Test maximum limit
  const maxLimitPage =
    await api.functional.discussionBoard.user.appeals.my.index(userConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page current page",
    maxLimitPage.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit page limit",
    maxLimitPage.pagination.pagination.pagination.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page records non-negative",
    maxLimitPage.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "max limit page pages non-negative",
    maxLimitPage.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Test default pagination (no parameters)
  const defaultPage =
    await api.functional.discussionBoard.user.appeals.my.index(userConnection, {
      body: {} satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page has valid pagination",
    defaultPage.pagination.pagination.pagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default page has valid limit",
    defaultPage.pagination.pagination.pagination.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "default page records non-negative",
    defaultPage.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default page pages non-negative",
    defaultPage.pagination.pagination.pagination.pagination.pages >= 0,
  );
}
