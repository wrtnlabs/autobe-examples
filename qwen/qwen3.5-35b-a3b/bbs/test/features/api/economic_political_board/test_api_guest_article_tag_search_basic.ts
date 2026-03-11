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

export async function test_api_guest_article_tag_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Perform tag search with a specific tag
  const searchTag = "economy";
  const result =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNames: [searchTag],
          sortBy: "newest" as const,
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals("has data array", Array.isArray(result.data), true);
  // 4. Validate pagination metadata accuracy
  const pagination = result.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20", pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // Calculate expected pages
  const expectedPages =
    pagination.records > 0
      ? Math.ceil(pagination.records / pagination.limit)
      : 0;
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    expectedPages,
  );
  // 5. Validate article summaries if any exist
  if (result.data.length > 0) {
    const firstArticle = result.data[0];
    typia.assert(firstArticle);
    // Validate article summary structure
    TestValidator.equals("has article id", firstArticle.id !== undefined, true);
    TestValidator.equals(
      "has article title",
      firstArticle.title !== undefined,
      true,
    );
    TestValidator.equals(
      "has author object",
      firstArticle.author !== undefined,
      true,
    );
    TestValidator.equals(
      "has created_at",
      firstArticle.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "has comment_count",
      firstArticle.comment_count !== undefined,
      true,
    );
    TestValidator.predicate(
      "comment_count is non-negative",
      firstArticle.comment_count >= 0,
    );
    // Validate author summary structure
    typia.assert(firstArticle.author);
    TestValidator.equals(
      "author has id",
      firstArticle.author.id !== undefined,
      true,
    );
    TestValidator.equals(
      "author has grade",
      firstArticle.author.grade !== undefined,
      true,
    );
    TestValidator.equals(
      "author has created_at",
      firstArticle.author.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "author has updated_at",
      firstArticle.author.updated_at !== undefined,
      true,
    );
    // Validate ISO date-time format
    const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    TestValidator.predicate(
      "created_at is valid ISO format",
      datePattern.test(firstArticle.created_at),
    );
    TestValidator.predicate(
      "author created_at is valid ISO format",
      datePattern.test(firstArticle.author.created_at),
    );
  }
  // 6. Test sorting by newest (if multiple articles exist)
  if (result.data.length >= 2) {
    // Verify articles are sorted by newest first (descending order)
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = result.data[i];
      const next = result.data[i + 1];
      TestValidator.predicate(
        "articles sorted by newest",
        new Date(current.created_at) >= new Date(next.created_at),
      );
    }
  }
  // 7. Test search with different tag
  const result2 =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          tagNames: ["politics"],
          sortBy: "newest" as const,
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "different tag returns result",
    result2.data !== undefined,
    true,
  );
  // 8. Test empty tag search (no filters)
  const result3 =
    await api.functional.economicPoliticalBoard.guest.articles.tags.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEconomicPoliticalBoardArticle.ITagSearch,
      },
    );
  typia.assert(result3);
  TestValidator.equals(
    "no filter returns result",
    result3.data !== undefined,
    true,
  );
}
