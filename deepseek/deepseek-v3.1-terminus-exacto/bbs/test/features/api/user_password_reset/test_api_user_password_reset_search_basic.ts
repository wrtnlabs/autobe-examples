import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple users to generate password reset records
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(user);
    users.push(user);
  }
  // Search for password reset records with default pagination using first user's connection
  const searchConnection: api.IConnection = { host: connection.host };
  searchConnection.headers = { Authorization: users[0].token.access };
  const searchResult: IPageIDiscussionBoardUserPasswordReset.ISummary =
    await api.functional.discussionBoard.user.users.password_resets.index(
      searchConnection,
      {
        body: {} satisfies IDiscussionBoardUserPasswordReset.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata - correctly access nested pagination structure
  // searchResult.pagination is IPageIDiscussionBoardSection.IPagination
  // searchResult.pagination.pagination is IPageIDiscussionBoardAdministratorPromotionRequest.IPagination
  // searchResult.pagination.pagination.pagination is IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination
  // searchResult.pagination.pagination.pagination.pagination is IPage.IPagination (contains current, limit, records, pages)
  const deepestPagination =
    searchResult.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "current page should be 1",
    deepestPagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    deepestPagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    deepestPagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    deepestPagination.pages >= 0,
  );
  // Validate data structure for each password reset record
  for (const record of searchResult.data) {
    typia.assert(record);
    // typia.assert already validates UUID and date-time formats
    // Validate user reference
    typia.assert(record.user);
    TestValidator.predicate(
      "user display_name should not be empty",
      record.user.display_name.length > 0,
    );
  }
}
