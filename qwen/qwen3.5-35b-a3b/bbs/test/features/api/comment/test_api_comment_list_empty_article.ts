import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_comment_list_empty_article(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Edge case: Retrieve comments from an article that has no comments.
  // Test Steps:
  // 1. Create an article via member account
  // 2. Access the article's comment list endpoint immediately after creation (before any comments are posted)
  // 3. Verify response returns empty data array: data=[]
  // 4. Verify pagination metadata shows: pagination.current=1, pagination.limit=20, pagination.records=0, pagination.pages=0
  // 5. Verify no author information or other data is returned (empty list handled gracefully)
  // 6. Verify the article's commentCount field (from article summary) correctly shows 0
  // 7. Confirm the endpoint returns 200 OK with valid pagination structure even when no comments exist
  // 8. Test that guests can also access this empty comment list (no authentication required)
  // 9. Verify the endpoint does not return errors or exceptions when article has zero comments
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 2. Create an article via member
  const article: IEconomicPoliticalBoardArticle =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 3. Test guest access (no authentication required for comment list)
  const comments: IPageIEconomicPoliticalBoardComment.ISummary =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sortDirection: "newest",
        },
      },
    );
  typia.assert(comments);
  // 4. Validate empty data array
  TestValidator.equals("comment list is empty", comments.data.length, 0);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    comments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", comments.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    comments.pagination.records,
    0,
  );
  TestValidator.equals("pagination total pages", comments.pagination.pages, 0);
  // 6. Validate article comment_count is 0
  TestValidator.equals("article comment count is 0", article.comment_count, 0);
}
