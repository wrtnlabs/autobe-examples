import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_article_tag_mappings_list_filter_by_article_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const administratorJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: administratorJoinBody,
  });
  typia.assert(adminAuthorized);
  // adminConnection.headers authorized internally after authorize_administrator_join call
  // 2. Prepare to call article-tag-mappings listing API with articleId filter
  // Since we need an existing articleId, we pick from the created data or simulate
  // For this test, call API without articleId first to get some data
  const allMappings =
    await api.functional.discussionBoard.administrator.article_tag_mappings.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(allMappings);
  // 3. Pick an articleId from the existing mappings
  if (allMappings.data.length === 0) {
    // No mappings to test, skip or throw
    throw new Error(
      "No article-tag mappings found to test filtering by articleId.",
    );
  }
  const sampleArticleId = allMappings.data[0].discussionBoardArticleId;
  // 4. Call article-tag-mappings listing API with filter by articleId
  const filteredMappings =
    await api.functional.discussionBoard.administrator.article_tag_mappings.index(
      adminConnection,
      {
        body: { articleId: sampleArticleId },
      },
    );
  typia.assert(filteredMappings);
  // 5. Validate that all returned mappings have the given articleId
  for (const mapping of filteredMappings.data) {
    TestValidator.equals(
      "articleId match",
      mapping.discussionBoardArticleId,
      sampleArticleId,
    );
    typia.assert(mapping.article);
  }
  // 6. Validate pagination metadata consistency
  const { pagination } = filteredMappings;
  TestValidator.predicate("pagination current >= 1", pagination.current >= 1);
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pagination records >= data length",
    pagination.records >= filteredMappings.data.length,
  );
  // Validate pages calculation
  TestValidator.predicate(
    "pages calculation",
    pagination.pages ===
      (pagination.limit === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
}
