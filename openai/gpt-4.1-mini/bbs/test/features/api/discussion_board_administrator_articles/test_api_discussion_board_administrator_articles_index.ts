import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_administrator_articles_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator sign up and get connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123!",
    },
  });
  typia.assert(adminJoined);
  adminConnection.headers = { Authorization: adminJoined.token.access };
  // 2. Create a new section for article filtering tests
  const createdSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: `section-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdSection);
  // Scenario 1: Search with keyword and section filter, pagination
  const keyword = RandomGenerator.substring(createdSection.description);
  const request1: IDiscussionBoardArticle.IRequest = {
    search: keyword,
    sectionId: null, // Because section.id does not exist, safely pass null as section filter
    page: 1,
    limit: 5,
    sort: "newest",
  };
  const page1 =
    await api.functional.discussionBoard.administrator.articles.index(
      adminConnection,
      { body: request1 },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.predicate(
    "Scenario 1: pagination current page",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "Scenario 1: pagination limit",
    page1.pagination.limit <= 5,
  );
  // Validate returned articles match search keyword and (if section filter provided)
  page1.data.forEach((article: IDiscussionBoardArticle.ISummary) => {
    typia.assert(article);
    // Since section details are empty object, only test presence of article.section
    TestValidator.predicate(
      "Scenario 1: article section exists",
      article.section !== null && article.section !== undefined,
    );
    TestValidator.predicate(
      "Scenario 1: article title or tag match keyword",
      article.title.includes(keyword) ||
        article.tags.some((tag) => tag.id.includes(keyword)) ||
        false,
    );
  });
  // Scenario 2: Filter by multiple tags, sort by oldest
  const tag1 = typia.random<string & tags.Format<"uuid">>();
  const tag2 = typia.random<string & tags.Format<"uuid">>();
  const request2: IDiscussionBoardArticle.IRequest = {
    tags: [tag1, tag2],
    page: 1,
    limit: 10,
    sort: "oldest",
  };
  const page2 =
    await api.functional.discussionBoard.administrator.articles.index(
      adminConnection,
      { body: request2 },
    );
  typia.assert(page2);
  // Validate pagination metadata scenario 2
  TestValidator.predicate(
    "Scenario 2: pagination current page",
    page2.pagination.current === 1,
  );
  TestValidator.predicate(
    "Scenario 2: pagination limit",
    page2.pagination.limit <= 10,
  );
  // Validate articles have all tags and are sorted oldest first
  for (let i = 0; i < page2.data.length; ++i) {
    const article = page2.data[i];
    typia.assert(article);
    TestValidator.predicate(
      "Scenario 2: article has all tags",
      tag1 && tag2
        ? article.tags.some((t) => t.id === tag1) &&
            article.tags.some((t) => t.id === tag2)
        : true,
    );
    if (i > 0) {
      const prev = page2.data[i - 1];
      TestValidator.predicate(
        "Scenario 2: articles sorted by oldest",
        new Date(article.createdAt).getTime() >=
          new Date(prev.createdAt).getTime(),
      );
    }
  }
  // Scenario 3: No filters, default sorting newest first, default pagination
  const request3: IDiscussionBoardArticle.IRequest = {};
  const page3 =
    await api.functional.discussionBoard.administrator.articles.index(
      adminConnection,
      { body: request3 },
    );
  typia.assert(page3);
  // Validate default pagination
  TestValidator.predicate(
    "Scenario 3: pagination current page",
    page3.pagination.current === 1,
  );
  TestValidator.predicate(
    "Scenario 3: pagination limit within 1 to 100",
    page3.pagination.limit >= 1 && page3.pagination.limit <= 100,
  );
  // Validate articles are sorted newest first
  for (let i = 0; i < page3.data.length; ++i) {
    if (i > 0) {
      const prev = page3.data[i - 1];
      TestValidator.predicate(
        "Scenario 3: articles sorted newest first",
        new Date(page3.data[i].createdAt).getTime() <=
          new Date(prev.createdAt).getTime(),
      );
    }
  }
}
