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

export async function test_api_guest_article_tag_search_multi_tag_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest user
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IEconomicPoliticalBoardGuest.IJoin>(),
  });
  // 2. Test multi-tag OR search - search with multiple tag names
  const multiTagSearch =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNames: ["economy", "politics"],
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(multiTagSearch);
  // 3. Test single tag search - compare with multi-tag
  const singleTagSearch =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNames: ["economy"],
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(singleTagSearch);
  // 4. Test tagNameExact - exact tag matching
  const exactTagSearch =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNameExact: "economy",
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(exactTagSearch);
  // 5. Test combined tagNameExact + tagNames - AND logic
  const combinedSearch =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNameExact: "economy",
          tagNames: ["policy"],
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(combinedSearch);
  // 6. Test sectionId filter with tag filter
  const sectionWithTagsSearch =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNames: ["economy"],
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(sectionWithTagsSearch);
  // 7. Test sorting - oldest
  const oldestSortSearch =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNames: ["economy"],
          sortBy: "oldest",
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(oldestSortSearch);
  // 8. Test sorting - popular
  const popularSortSearch =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNames: ["economy"],
          sortBy: "popular",
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(popularSortSearch);
  // Validate results structure
  TestValidator.notEquals(
    "multi-tag search has valid pagination",
    multiTagSearch.pagination,
    null,
  );
  TestValidator.notEquals(
    "single tag search has valid pagination",
    singleTagSearch.pagination,
    null,
  );
  TestValidator.notEquals(
    "exact tag search has valid pagination",
    exactTagSearch.pagination,
    null,
  );
  TestValidator.notEquals(
    "combined search has valid pagination",
    combinedSearch.pagination,
    null,
  );
  TestValidator.notEquals(
    "section with tags search has valid pagination",
    sectionWithTagsSearch.pagination,
    null,
  );
  TestValidator.notEquals(
    "oldest sort search has valid pagination",
    oldestSortSearch.pagination,
    null,
  );
  TestValidator.notEquals(
    "popular sort search has valid pagination",
    popularSortSearch.pagination,
    null,
  );
  // Validate pagination structure
  TestValidator.equals(
    "multi-tag pagination has current page",
    multiTagSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "multi-tag pagination has valid limit",
    multiTagSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "multi-tag pagination has valid records",
    multiTagSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "multi-tag pagination has valid pages",
    multiTagSearch.pagination.pages >= 0,
  );
}
