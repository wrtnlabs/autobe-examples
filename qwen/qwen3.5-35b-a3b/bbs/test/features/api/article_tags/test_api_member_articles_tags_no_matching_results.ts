import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
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

export async function test_api_member_articles_tags_no_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member and article with economy, finance tags
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  // Create section for the article (generate random section ID that won't match)
  const articleSectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create article with economy and finance tags
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          sectionId: articleSectionId,
          tags: ["economy", "finance"],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 2. Test: Non-existent tags
  const nonExistentTags: IPageIEconomicPoliticalBoardArticle.ISummary =
    await api.functional.economicPoliticalBoard.member.articles.tags.index(
      memberConnection,
      {
        body: {
          tagNames: ["technology", "innovation"],
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(nonExistentTags);
  TestValidator.equals(
    "non-existent tags return empty",
    nonExistentTags.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent tags pagination current",
    nonExistentTags.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-existent tags pagination records",
    nonExistentTags.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent tags pagination pages",
    nonExistentTags.pagination.pages,
    0,
  );
  // 3. Test: Exact match non-existent tag
  const exactNonExistentTag: IPageIEconomicPoliticalBoardArticle.ISummary =
    await api.functional.economicPoliticalBoard.member.articles.tags.index(
      memberConnection,
      {
        body: {
          tagNameExact: "innovation",
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(exactNonExistentTag);
  TestValidator.equals(
    "exact non-existent tag return empty",
    exactNonExistentTag.data.length,
    0,
  );
  TestValidator.equals(
    "exact non-existent tag pagination records",
    exactNonExistentTag.pagination.records,
    0,
  );
  TestValidator.equals(
    "exact non-existent tag pagination pages",
    exactNonExistentTag.pagination.pages,
    0,
  );
  // 4. Test: Combination filter (matching tag but different section)
  // Create another article with economy tag in a different section
  const differentSectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const anotherArticle =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          sectionId: differentSectionId,
          tags: ["economy"],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(anotherArticle);
  const combinationFilter: IPageIEconomicPoliticalBoardArticle.ISummary =
    await api.functional.economicPoliticalBoard.member.articles.tags.index(
      memberConnection,
      {
        body: {
          tagNames: ["economy"],
          sectionId: articleSectionId, // Article is in differentSectionId, not this one
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(combinationFilter);
  TestValidator.equals(
    "combination filter returns empty",
    combinationFilter.data.length,
    0,
  );
  TestValidator.equals(
    "combination filter pagination records",
    combinationFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "combination filter pagination pages",
    combinationFilter.pagination.pages,
    0,
  );
}