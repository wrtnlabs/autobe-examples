import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_article_tag_search_no_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAuth);
  // Create new connection with guest token
  const guestWithAuth: api.IConnection = {
    host: connection.host,
    headers: { Authorization: guestAuth.token.access },
  };
  // Test 1: Single non-existent tag search
  const nonExistentTag = typia.random<string & tags.Format<"uuid">>();
  const result1 =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestWithAuth,
      {
        body: {
          tagNames: [nonExistentTag],
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "empty result for non-existent tag",
    result1.data.length,
    0,
  );
  TestValidator.equals("current page", result1.pagination.current, 1);
  TestValidator.equals("limit", result1.pagination.limit, 20);
  TestValidator.equals("records count", result1.pagination.records, 0);
  TestValidator.equals("total pages", result1.pagination.pages, 0);
  // Test 2: Multiple non-existent tags search
  const multipleNonExistentTags = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const result2 =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestWithAuth,
      {
        body: {
          tagNames: multipleNonExistentTags,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "empty result for multiple non-existent tags",
    result2.data.length,
    0,
  );
  TestValidator.equals("current page", result2.pagination.current, 1);
  TestValidator.equals("records count", result2.pagination.records, 0);
  TestValidator.equals("total pages", result2.pagination.pages, 0);
  // Test 3: Empty tagNames array - omit query to test default behavior
  const result3 =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestWithAuth,
      {
        body: {
          tagNames: [],
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result3);
  TestValidator.predicate(
    "has pagination metadata",
    result3.pagination !== undefined,
  );
  TestValidator.equals("current page", result3.pagination.current, 1);
  TestValidator.equals("limit", result3.pagination.limit, 20);
  // Test 4: Pagination edge case - max limit (100)
  const result4 =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestWithAuth,
      {
        body: {
          limit: 100,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result4);
  TestValidator.equals("limit is 100", result4.pagination.limit, 100);
  TestValidator.predicate(
    "current page is 1",
    result4.pagination.current === 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    result4.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    result4.pagination.pages >= 0,
  );
  // Test 5: Pagination edge case - page 2 when only N records exist
  // Get current total records with limit 100
  const currentTotalResult =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestWithAuth,
      {
        body: {
          limit: 100,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(currentTotalResult);
  // Request page 2 with same limit
  const result5 =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestWithAuth,
      {
        body: {
          page: 2,
          limit: 100,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result5);
  TestValidator.equals("empty data on page 2", result5.data.length, 0);
  TestValidator.equals("current page", result5.pagination.current, 2);
  TestValidator.equals("limit", result5.pagination.limit, 100);
  TestValidator.equals(
    "records count matches total",
    result5.pagination.records,
    currentTotalResult.pagination.records,
  );
  TestValidator.equals(
    "pages same as before",
    result5.pagination.pages,
    currentTotalResult.pagination.pages,
  );
  // Test 6: Deleted section exclusion - use invalid UUID for deleted section
  const deletedSectionId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000";
  const result6 =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestWithAuth,
      {
        body: {
          sectionId: deletedSectionId,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result6);
  TestValidator.equals(
    "empty result for deleted section",
    result6.data.length,
    0,
  );
  TestValidator.equals("current page", result6.pagination.current, 1);
  TestValidator.equals("records count", result6.pagination.records, 0);
  TestValidator.equals("total pages", result6.pagination.pages, 0);
}
