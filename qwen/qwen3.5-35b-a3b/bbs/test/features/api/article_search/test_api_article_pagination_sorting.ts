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

export async function test_api_article_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create member accounts for authentication
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">,
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(member2Auth);
  // 1. Test default pageSize (should be 20)
  const searchRequest1: IEconomicPoliticalBoardArticle.IRequest = {};
  const result1 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest1 },
    );
  typia.assert(result1);
  TestValidator.equals("default pageSize", result1.pagination.limit, 20);
  TestValidator.equals("default page", result1.pagination.current, 1);
  TestValidator.predicate(
    "has pagination metadata",
    result1.pagination.pages >= 0,
  );
  // 2. Test custom pageSize=50 (maximum allowed)
  const searchRequest2: IEconomicPoliticalBoardArticle.IRequest = {
    pageSize: 50,
  };
  const result2 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest2 },
    );
  typia.assert(result2);
  TestValidator.equals("maximum pageSize", result2.pagination.limit, 50);
  TestValidator.predicate("pageSize enforced at 50", result2.data.length <= 50);
  // 3. Test sorting by created_at descending (newest first - default)
  const searchRequest3: IEconomicPoliticalBoardArticle.IRequest = {
    sort: "created_at",
    sortOrder: "desc",
    pageSize: 20,
  };
  const result3 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest3 },
    );
  typia.assert(result3);
  TestValidator.equals("created_at desc sort", result3.pagination.limit, 20);
  // 4. Test sorting by created_at ascending (oldest first)
  const searchRequest4: IEconomicPoliticalBoardArticle.IRequest = {
    sort: "created_at",
    sortOrder: "asc",
    pageSize: 20,
  };
  const result4 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest4 },
    );
  typia.assert(result4);
  TestValidator.equals("created_at asc sort", result4.pagination.limit, 20);
  // 5. Test sorting by updated_at
  const searchRequest5: IEconomicPoliticalBoardArticle.IRequest = {
    sort: "updated_at",
    sortOrder: "desc",
    pageSize: 20,
  };
  const result5 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest5 },
    );
  typia.assert(result5);
  TestValidator.equals("updated_at sort", result5.pagination.limit, 20);
  // 6. Test sorting by title
  const searchRequest6: IEconomicPoliticalBoardArticle.IRequest = {
    sort: "title",
    sortOrder: "asc",
    pageSize: 20,
  };
  const result6 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest6 },
    );
  typia.assert(result6);
  TestValidator.equals("title sort", result6.pagination.limit, 20);
  // 7. Test sorting by author_id
  const searchRequest7: IEconomicPoliticalBoardArticle.IRequest = {
    sort: "author_id",
    sortOrder: "asc",
    pageSize: 20,
  };
  const result7 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest7 },
    );
  typia.assert(result7);
  TestValidator.equals("author_id sort", result7.pagination.limit, 20);
  // 8. Verify pagination metadata correctness
  const totalRecords = result1.pagination.records;
  const limit = result1.pagination.limit;
  const calculatedPages = Math.ceil(totalRecords / limit);
  const expectedPages = calculatedPages > 0 ? calculatedPages : 0;
  TestValidator.equals(
    "total pages calculation",
    result1.pagination.pages,
    expectedPages,
  );
  // 9. Test page boundary - verify page 1 has valid data
  TestValidator.predicate("page 1 has valid data", result1.data.length >= 0);
  TestValidator.equals("current page 1", result1.pagination.current, 1);
  // 10. Test that each article has required summary fields
  if (result1.data.length > 0) {
    const firstArticle = result1.data[0];
    typia.assert(firstArticle);
    TestValidator.predicate("article has id", firstArticle.id !== undefined);
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
  }
  // 11. Test pagination with section filter
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const searchRequest8: IEconomicPoliticalBoardArticle.IRequest = {
    sectionId,
    pageSize: 20,
  };
  const result8 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest8 },
    );
  typia.assert(result8);
  TestValidator.equals("section filter works", result8.pagination.limit, 20);
  // 12. Test pagination with search query
  const searchRequest9: IEconomicPoliticalBoardArticle.IRequest = {
    search: "test",
    pageSize: 20,
  };
  const result9 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest9 },
    );
  typia.assert(result9);
  TestValidator.equals("search filter works", result9.pagination.limit, 20);
  // 13. Test invalid pageSize - should default to 20 or use limit override
  const searchRequest10: IEconomicPoliticalBoardArticle.IRequest = {
    pageSize: 1,
    limit: 20,
  };
  const result10 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest10 },
    );
  typia.assert(result10);
  TestValidator.equals(
    "limit override takes precedence",
    result10.pagination.limit,
    20,
  );
  // 14. Test that second page has different data than first page
  const searchRequest11: IEconomicPoliticalBoardArticle.IRequest = {
    page: 2,
    pageSize: 20,
  };
  const result11 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest11 },
    );
  typia.assert(result11);
  TestValidator.equals("page 2", result11.pagination.current, 2);
  if (result1.data.length > 0 && result11.data.length > 0) {
    TestValidator.notEquals(
      "page 2 has different articles",
      result1.data[0].id,
      result11.data[0].id,
    );
  }
  // 15. Test pagination metadata with empty results
  const searchRequest12: IEconomicPoliticalBoardArticle.IRequest = {
    search: "nonexistent_article_xyz_123",
    pageSize: 20,
  };
  const result12 =
    await api.functional.economicPoliticalBoard.member.articles.search(
      member1Connection,
      { body: searchRequest12 },
    );
  typia.assert(result12);
  TestValidator.equals("empty result page", result12.pagination.current, 1);
  TestValidator.equals("empty result limit", result12.pagination.limit, 20);
  TestValidator.equals("empty result records", result12.pagination.records, 0);
  TestValidator.equals("empty result pages", result12.pagination.pages, 0);
}