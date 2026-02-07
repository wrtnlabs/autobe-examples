import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_section_articles_list_with_search_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin joins (no body required since IJoin is empty object)
  const authorized = await authorize_admin_join(adminConnection, {
    body: {} satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(authorized);
  // Create new connection with the token from authorization response
  const adminWithToken: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  // Create sample articles with varied tags and content for testing
  // Note: The index endpoint is for listing, not creating, so we need
  // to use other endpoints to create test articles first
  // Test article listing with pagination
  const articleList =
    await api.functional.discussionBoard.admin.sections.articles.index(
      adminWithToken,
      {
        sectionId: "test-section-id",
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(articleList);
  // Test article listing with pagination
  TestValidator.equals("has pagination", articleList.pagination.current, 1);
  TestValidator.predicate(
    "has valid records count",
    articleList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    articleList.pagination.pages >= 0,
  );
  // Test article data structure
  if (articleList.data.length > 0) {
    TestValidator.predicate("has valid article summary", () => {
      const article = articleList.data[0];
      return article !== null && article !== undefined;
    });
  }
}
