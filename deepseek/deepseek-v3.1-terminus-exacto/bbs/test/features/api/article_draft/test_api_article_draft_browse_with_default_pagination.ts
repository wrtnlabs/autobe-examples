import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test authenticated user accessing empty article drafts list with default pagination.
 * Verifies proper authentication handling and empty state response structure.
 */
export async function test_api_article_draft_browse_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection using SDK directly (utility not available)
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(authorizedUser);
  // User connection headers are now updated with authentication token
  // Access article drafts with default pagination (page=1, limit=20)
  const response =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          // Using default values: page=1, limit=20 as per scenario
          page: undefined,
          limit: undefined,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata for empty result set
  TestValidator.equals("current page is 1", (response.pagination as any).page, 1);
  TestValidator.equals("limit is default value", (response.pagination as any).limit, 20);
  TestValidator.equals("total records is 0", (response.pagination as any).total, 0);
  TestValidator.equals("total pages is 0", (response.pagination as any).pages, 0);
  // Validate empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
}