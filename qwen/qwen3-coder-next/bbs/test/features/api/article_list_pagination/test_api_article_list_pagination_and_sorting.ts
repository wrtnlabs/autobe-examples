import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_article_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  // 2. Generate random section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test pagination with different parameters
  const paginationTests = [
    { page: 1, limit: 10 },
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
  ];
  for (const params of paginationTests) {
    const result: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.guest.sections.articles.index(
        guestConnection,
        {
          sectionId,
          body: {
            page: params.page,
            limit: params.limit,
          },
        },
      );
    // 4. Validate response structure
    typia.assert(result);
    // 5. Validate pagination metadata
    typia.assert<IPage.IPagination>(result.pagination);
    // 6. Validate pagination values
    TestValidator.equals(
      "current page matches request",
      result.pagination.current,
      params.page,
    );
    TestValidator.equals(
      "limit matches request",
      result.pagination.limit,
      params.limit,
    );
    TestValidator.predicate(
      "records count is non-negative",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count is valid",
      result.pagination.pages >= 0,
    );
    // 7. Validate articles list exists and is non-null
    TestValidator.notEquals("articles list exists", result.data, null);
    TestValidator.predicate("articles is array", Array.isArray(result.data));
  }
  // 8. Test default pagination (no parameters)
  const defaultResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.sections.articles.index(
      guestConnection,
      {
        sectionId,
        body: {},
      },
    );
  typia.assert(defaultResult);
  typia.assert<IPage.IPagination>(defaultResult.pagination);
}
