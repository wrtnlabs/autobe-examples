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

export async function test_api_article_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as two different members
  const memberConnection1: api.IConnection = { host: connection.host };
  const memberAuth1 = await authorize_member_join(memberConnection1, {
    body: typia.random<IEconomicPoliticalBoardMember.IJoin>(),
  });
  typia.assert(memberAuth1);
  const memberConnection2: api.IConnection = { host: connection.host };
  const memberAuth2 = await authorize_member_join(memberConnection2, {
    body: typia.random<IEconomicPoliticalBoardMember.IJoin>(),
  });
  typia.assert(memberAuth2);
  // Step 2: Perform text search with various lengths
  const validSearchQuery = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 8,
  });
  const searchResponse1 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          search: validSearchQuery,
          sort: "created_at",
          sortOrder: "desc",
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchResponse1);
  // Step 3: Test pagination with page=2 and different pageSize
  const searchResponse2 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          search: validSearchQuery,
          page: 2,
          pageSize: 10,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchResponse2);
  TestValidator.equals(
    "pagination current page",
    searchResponse2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    searchResponse2.pagination.limit,
    10,
  );
  // Step 4: Test sorting (oldest first - ascending)
  const searchResponse3 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          search: validSearchQuery,
          sort: "created_at",
          sortOrder: "asc",
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchResponse3);
  // Step 5: Test empty search (returns all articles, paginated)
  const searchResponse4 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchResponse4);
  // Step 6: Test section filter
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const searchResponse5 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          sectionId,
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchResponse5);
  // Step 7: Test tag filter
  const tagId = typia.random<string & tags.Format<"uuid">>();
  const searchResponse6 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          tagId,
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchResponse6);
  // Step 8: Validate response structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(searchResponse1.data),
  );
  // Step 9: Test search validation (too short - should fail)
  await TestValidator.error("search too short", async () => {
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          search: "x", // Only 1 character
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  });
  // Step 10: Test search validation (too long - should fail)
  await TestValidator.error("search too long", async () => {
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          search: RandomGenerator.alphabets(101), // 101 characters
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  });
  // Step 11: Test invalid pagination (zero - should fail)
  await TestValidator.error("invalid page zero", async () => {
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          page: 0,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  });
  // Step 12: Test invalid pagination (negative - should fail)
  await TestValidator.error("invalid page negative", async () => {
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection1,
      {
        body: {
          page: -1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  });
  // Step 13: Validate pagination structure
  TestValidator.predicate(
    "pagination has current",
    searchResponse1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResponse1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    searchResponse1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    searchResponse1.pagination.pages >= 0,
  );
  // Step 14: Validate article summary fields when data exists
  if (searchResponse1.data.length > 0) {
    const firstArticle = searchResponse1.data[0];
    typia.assert(firstArticle);
    TestValidator.predicate(
      "article has id",
      firstArticle.id !== undefined,
    );
    TestValidator.predicate(
      "article has title",
      firstArticle.title !== undefined,
    );
    TestValidator.predicate(
      "article has author",
      firstArticle.author !== undefined,
    );
    TestValidator.predicate(
      "article has section",
      firstArticle.section !== undefined,
    );
    TestValidator.predicate(
      "article has created_at",
      firstArticle.created_at !== undefined,
    );
    TestValidator.predicate(
      "article has updated_at",
      firstArticle.updated_at !== undefined,
    );
    TestValidator.predicate(
      "article has deleted_at",
      firstArticle.deleted_at !== undefined,
    );
    // Validate author summary structure
    typia.assert(firstArticle.author);
    TestValidator.predicate(
      "author has id",
      firstArticle.author.id !== undefined,
    );
    TestValidator.predicate(
      "author has userId",
      firstArticle.author.userId !== undefined,
    );
    TestValidator.predicate(
      "author has grade",
      firstArticle.author.grade === "regular" ||
        firstArticle.author.grade === "super",
    );
    // Validate section summary structure
    typia.assert(firstArticle.section);
    TestValidator.predicate(
      "section has id",
      firstArticle.section.id !== undefined,
    );
    TestValidator.predicate(
      "section has name",
      firstArticle.section.name !== undefined,
    );
    TestValidator.predicate(
      "section article count is non-negative",
      firstArticle.section.articleCount >= 0,
    );
  }
  // Step 15: Test custom page size limits
  for (const pageSize of [5, 10, 20, 50]) {
    const searchResponse =
      await api.functional.economicPoliticalBoard.member.articles.search(
        memberConnection1,
        {
          body: {
            page: 1,
            pageSize,
          } satisfies IEconomicPoliticalBoardArticle.IRequest,
        },
      );
    typia.assert(searchResponse);
    TestValidator.equals(
      `page size ${pageSize}`,
      searchResponse.pagination.limit,
      pageSize,
    );
  }
}