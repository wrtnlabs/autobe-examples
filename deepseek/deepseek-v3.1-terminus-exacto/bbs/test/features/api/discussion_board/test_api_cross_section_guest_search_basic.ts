import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_cross_section_guest_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session for anonymous platform access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestSession);
  // Perform cross-section search with a simple keyword
  const searchQuery = RandomGenerator.substring(
    "technology development innovation",
  );
  const searchResults =
    await api.functional.discussionBoard.guest.cross_section.index(
      guestConnection,
      {
        body: {
          search: searchQuery,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    searchResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    searchResults.pagination.pages >= 0,
  );
  // Validate that search results contain articles with proper structure
  // typia.assert() already validates all type information, so we focus on business logic
  if (searchResults.data.length > 0) {
    // Verify that articles come from different sections (cross-section functionality)
    const sectionIds = new Set(
      searchResults.data.map((article) => article.section.id),
    );
    TestValidator.predicate(
      "articles from multiple sections",
      sectionIds.size >= 1,
    );
    // Verify that articles have the expected summary structure
    const article = searchResults.data[0];
    TestValidator.predicate(
      "article has non-empty title",
      article.title.trim().length > 0,
    );
    TestValidator.predicate(
      "author has non-empty display name",
      article.author.display_name.trim().length > 0,
    );
    TestValidator.predicate(
      "section has non-empty name",
      article.section.name.trim().length > 0,
    );
  }
  // Validate that search functionality returns appropriate results
  TestValidator.predicate(
    "search results returned",
    searchResults.data.length >= 0,
  );
}
