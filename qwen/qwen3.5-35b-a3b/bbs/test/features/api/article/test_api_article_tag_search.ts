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

export async function test_api_article_tag_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      displayName: "Tag Search Test User",
      bio: "Testing tag search functionality",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test tag search with valid tagId (will return empty if no articles with that tag)
  const validTagId = typia.random<string & tags.Format<"uuid">>();
  const searchWithValidTag =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tagId: validTagId,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchWithValidTag);
  // 3. Test tag search with non-existent tagId
  const nonExistentTagId = "00000000-0000-0000-0000-000000000000";
  const searchWithNonExistentTag =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tagId: nonExistentTagId,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchWithNonExistentTag);
  // 4. Test search with text search (avoiding empty string validation)
  const searchWithText =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection,
      {
        body: {
          search: "test",
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchWithText);
  // 5. Test pagination with tag filter
  const searchPaginated =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tagId: validTagId,
          page: 1,
          pageSize: 10,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchPaginated);
  // 6. Validate pagination structure
  TestValidator.equals(
    "pagination records is non-negative",
    searchWithValidTag.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    searchWithValidTag.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination current defaults to 1",
    searchWithValidTag.pagination.current >= 1,
    true,
  );
  // 7. Test with different sort orders
  const searchNewest =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection,
      {
        body: {
          sort: "created_at",
          sortOrder: "desc",
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchNewest);
  const searchOldest =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection,
      {
        body: {
          sort: "created_at",
          sortOrder: "asc",
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchOldest);
  // 8. Test that both searches return the same pagination metadata structure
  TestValidator.equals(
    "pagination structure consistent",
    typeof searchWithValidTag.pagination.current,
    typeof searchNewest.pagination.current,
  );
  // 9. Validate that non-existent tag returns empty results with proper metadata
  TestValidator.equals(
    "non-existent tag has zero records",
    searchWithNonExistentTag.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent tag has zero pages",
    searchWithNonExistentTag.pagination.pages,
    0,
  );
  // 10. Test section filter (if valid sectionId exists)
  const randomSectionId = typia.random<string & tags.Format<"uuid">>();
  const searchWithTagAndSection =
    await api.functional.economicPoliticalBoard.member.articles.search(
      memberConnection,
      {
        body: {
          tagId: validTagId,
          sectionId: randomSectionId,
        } satisfies IEconomicPoliticalBoardArticle.IRequest,
      },
    );
  typia.assert(searchWithTagAndSection);
  TestValidator.equals(
    "combined filters return non-negative records",
    searchWithTagAndSection.pagination.records >= 0,
    true,
  );
}
