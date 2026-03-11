import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_member_articles_tags_cross_section_discovery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminJoin);
  // 2. Admin creates section A
  const sectionA =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminLoginConnection,
      {
        body: {
          name: "Economic Policy",
          description: "Discussion about economic policies",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(sectionA);
  // 3. Admin creates section B
  const sectionB =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminLoginConnection,
      {
        body: {
          name: "Tax Reform",
          description: "Tax reform discussions",
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(sectionB);
  // 4. Member setup for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      name: RandomGenerator.name(),
      password: memberPassword,
    },
  });
  typia.assert(memberJoin);
  // 5. Member creates article 1 in section A with tags economy, tax
  const article1 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: "Tax Impact Analysis",
          content:
            "This article discusses the impact of tax policies on the economy.",
          sectionId: sectionA.id,
          tags: ["economy", "tax"],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  // 6. Member creates article 2 in section B with tags tax, policy
  const article2 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: "Policy Tax Reform",
          content: "Analysis of tax reform policies and their implications.",
          sectionId: sectionB.id,
          tags: ["tax", "policy"],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // 7. Test single tag search with tagNameExact='tax' (should return both articles)
  const singleTagSearch =
    await api.functional.economicPoliticalBoard.member.articles.tags.index(
      memberConnection,
      {
        body: {
          tagNameExact: "tax",
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(singleTagSearch);
  TestValidator.equals(
    "single tag search returns 2 articles",
    singleTagSearch.data.length,
    2,
  );
  TestValidator.equals(
    "single tag search metadata records",
    singleTagSearch.pagination.records,
    2,
  );
  // 8. Test multiple tag search with tagNames=['economy', 'policy'] (OR matching)
  const multipleTagSearch =
    await api.functional.economicPoliticalBoard.member.articles.tags.index(
      memberConnection,
      {
        body: {
          tagNames: ["economy", "policy"],
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(multipleTagSearch);
  TestValidator.equals(
    "multiple tag search returns 2 articles",
    multipleTagSearch.data.length,
    2,
  );
  TestValidator.equals(
    "multiple tag search metadata records",
    multipleTagSearch.pagination.records,
    2,
  );
  // 9. Test pagination with tagNameExact='economy', page=1, limit=10
  const paginationSearch =
    await api.functional.economicPoliticalBoard.member.articles.tags.index(
      memberConnection,
      {
        body: {
          tagNameExact: "economy",
          page: 1,
          limit: 10,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(paginationSearch);
  TestValidator.equals(
    "pagination search returns 1 article",
    paginationSearch.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current",
    paginationSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationSearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records",
    paginationSearch.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    paginationSearch.pagination.pages,
    1,
  );
  // 10. Test section filtering with tagNameExact='tax', sectionId=sectionA.id
  const sectionFilterSearch =
    await api.functional.economicPoliticalBoard.member.articles.tags.index(
      memberConnection,
      {
        body: {
          tagNameExact: "tax",
          sectionId: sectionA.id,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(sectionFilterSearch);
  TestValidator.equals(
    "section filter returns 1 article",
    sectionFilterSearch.data.length,
    1,
  );
  TestValidator.equals(
    "section filter metadata records",
    sectionFilterSearch.pagination.records,
    1,
  );
  // 11. Validate article summaries include required fields
  const firstArticleSummary = singleTagSearch.data[0];
  typia.assert(firstArticleSummary);
  TestValidator.equals(
    "article has id",
    typeof firstArticleSummary.id,
    "string",
  );
  TestValidator.equals(
    "article has title",
    typeof firstArticleSummary.title,
    "string",
  );
  TestValidator.equals(
    "article has author",
    !!firstArticleSummary.author,
    true,
  );
  TestValidator.equals(
    "article has created_at",
    typeof firstArticleSummary.created_at,
    "string",
  );
  TestValidator.equals(
    "article has comment_count",
    typeof firstArticleSummary.comment_count,
    "number",
  );
  // 12. Validate author contains displayName
  TestValidator.equals(
    "author has displayName",
    !!(firstArticleSummary.author as any).displayName,
    true,
  );
}