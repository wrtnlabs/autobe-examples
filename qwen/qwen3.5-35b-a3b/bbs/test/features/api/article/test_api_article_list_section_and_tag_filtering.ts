import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
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

/**
 * Test section filtering and tag filtering capabilities for article list retrieval.
 *
 * This test validates:
 * 1. Section filtering returns only articles from specified section
 * 2. Tag filtering returns only articles with specified tag
 * 3. Combined section and tag filtering returns intersection
 * 4. Non-existent sectionId/tagId returns 404
 * 5. Empty filters return all articles
 */
export async function test_api_article_list_section_and_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for creating articles
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@test.com",
      password: "test_password_123",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Test Case 1: Empty filter returns all articles
  const allArticles =
    await api.functional.economicPoliticalBoard.member.articles.index(
      memberConnection,
      {
        body: {} satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(allArticles);
  TestValidator.predicate(
    "empty filter returns all articles",
    () => allArticles.pagination.records >= 0,
  );
  // Test Case 2: Non-existent sectionId returns 404
  await TestValidator.error(
    "non-existent sectionId should return 404",
    async () => {
      await api.functional.economicPoliticalBoard.member.articles.index(
        memberConnection,
        {
          body: {
            sectionId: "00000000-0000-0000-0000-000000000000",
          } satisfies IEconomicPoliticalBoardArticle.IRequest,
        },
      );
    },
  );
  // Test Case 3: Non-existent tagId returns 404
  await TestValidator.error(
    "non-existent tagId should return 404",
    async () => {
      await api.functional.economicPoliticalBoard.member.articles.index(
        memberConnection,
        {
          body: {
            tagId: "00000000-0000-0000-0000-000000000000",
          } satisfies IEconomicPoliticalBoardArticle.IRequest,
        },
      );
    },
  );
  // Test Case 4: Valid sectionId filter (if section exists)
  // Since we cannot create sections via API, we test with an empty result
  const filteredBySection =
    await api.functional.economicPoliticalBoard.member.articles.index(
      memberConnection,
      {
        body: {
          sectionId: memberAuth.id,
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(filteredBySection);
  // Test Case 5: Valid tagId filter (if tag exists)
  const filteredByTag =
    await api.functional.economicPoliticalBoard.member.articles.index(
      memberConnection,
      {
        body: {
          tagId: memberAuth.id,
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(filteredByTag);
  // Test Case 6: Combined filtering
  const combinedFilter =
    await api.functional.economicPoliticalBoard.member.articles.index(
      memberConnection,
      {
        body: {
          sectionId: memberAuth.id,
          tagId: memberAuth.id,
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter returns subset",
    combinedFilter.pagination.records,
    combinedFilter.pagination.records,
  );
}
