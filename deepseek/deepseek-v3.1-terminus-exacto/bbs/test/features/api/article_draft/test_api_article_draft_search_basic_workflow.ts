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
import { IConnection} from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_article_draft_search_basic_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Test basic search with minimal parameters
  const basicSearch =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(basicSearch);
  // Test pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    basicSearch.pagination && typeof basicSearch.pagination === "object",
  );
  // Test data array exists
  TestValidator.predicate("data array exists", Array.isArray(basicSearch.data));
  // If there are drafts returned, validate their structure
  if (basicSearch.data.length > 0) {
    const draft = basicSearch.data[0];
    TestValidator.predicate(
      "draft has valid UUID id",
      typeof draft.id === "string" && draft.id.length > 0,
    );
    TestValidator.predicate(
      "draft has title",
      typeof draft.draft_title === "string",
    );
    TestValidator.predicate(
      "draft has status",
      typeof draft.draft_status === "string",
    );
    TestValidator.predicate(
      "draft has valid timestamps",
      typeof draft.last_saved_at === "string" &&
        typeof draft.draft_created_at === "string" &&
        typeof draft.draft_updated_at === "string",
    );
  }
  // Test search with title filter
  const titleSearch =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          search_title: "Test",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(titleSearch);
  // Test search with status filter - removed draft_status as it doesn't exist in IRequest
  const statusSearch =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(statusSearch);
  // Test search with date range
  const dateSearch =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          draft_created_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          draft_created_at_to: new Date().toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(dateSearch);
  // Test different pagination parameters
  const paginationTest =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(paginationTest);
}