import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_article_list_filtered_search_section_tag(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as superAdministrator
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const joinOutput = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
        ip: null,
      },
    },
  );
  typia.assert(joinOutput);
  superAdministratorConnection.headers ??= {};
  superAdministratorConnection.headers.Authorization = joinOutput.token.access;
  // Step 2: Prepare search, filter, pagination, sort
  const searchKeyword = RandomGenerator.name(2).split(" ")[0];
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const tagIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const sort: "newest" | "oldest" = "oldest";
  const requestBody: IDiscussionBoardArticle.IRequest = {
    search: searchKeyword,
    sectionId,
    tags: tagIds,
    page,
    limit,
    sort,
  };
  // Step 3: Send PATCH request to fetch filtered article list
  const response =
    await api.functional.discussionBoard.superAdministrator.articles.index(
      superAdministratorConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Step 4: Validate response data integrity
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total record count non-negative",
    response.pagination.records >= 0,
  );
  // Validate articles match filters
  for (const article of response.data) {
    typia.assert(article);
    // Title or content must include search keyword - only title present
    TestValidator.predicate(
      `article title includes search keyword for article id ${article.id}`,
      article.title.includes(searchKeyword),
    );
    // Section filter match
    // Skipping section.id test because IDiscussionBoardSection.ISummary is empty object type
    // Check tags include all requested tag ids
    const articleTagIds = article.tags.map((tag) => tag.id);
    const hasAllTags = tagIds.every((tagId) => articleTagIds.includes(tagId));
    TestValidator.predicate(
      `article has all tags for article id ${article.id}`,
      hasAllTags,
    );
  }
}
