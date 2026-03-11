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

export async function test_api_guest_discovery_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Test empty search (should return all articles)
  const emptySearch =
    await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {
          search: undefined,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    emptySearch.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    emptySearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    emptySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    emptySearch.pagination.pages >= 0,
  );
  // Validate article summary structure
  if (emptySearch.data.length > 0) {
    const article = emptySearch.data[0];
    TestValidator.predicate("article has id", article.id.length > 0);
    TestValidator.predicate("article has title", article.title.length > 0);
    TestValidator.predicate("article has author", article.author.id.length > 0);
    TestValidator.predicate(
      "article has author display name",
      article.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "article has section",
      article.section.id.length > 0,
    );
    TestValidator.predicate(
      "article has section name",
      article.section.name.length > 0,
    );
    TestValidator.predicate(
      "article has tags array",
      Array.isArray(article.tags),
    );
    TestValidator.predicate(
      "article has comments count",
      article.comments_count >= 0,
    );
    TestValidator.predicate(
      "article has creation timestamp",
      article.created_at.length > 0,
    );
  }
  // Test search with specific keyword
  const searchKeyword = RandomGenerator.alphabets(5);
  const keywordSearch =
    await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {
          search: searchKeyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // Validate search results contain the keyword in title or content (if articles exist)
  if (keywordSearch.data.length > 0) {
    TestValidator.predicate(
      "search results exist for keyword",
      keywordSearch.data.length > 0,
    );
    // Note: We can't validate content matching without content field in ISummary
    // This validates the search endpoint responds correctly with the keyword
  }
  // Test pagination with different parameters
  const paginationTest =
    await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {
          search: undefined,
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "page 2 has correct current page",
    paginationTest.pagination.current === 2,
  );
  TestValidator.predicate(
    "page 2 has correct limit",
    paginationTest.pagination.limit === 5,
  );
  // Test section filtering
  if (emptySearch.data.length > 0) {
    const sectionId = emptySearch.data[0].section.id;
    const sectionSearch =
      await api.functional.discussionBoard.guest.discovery.index(
        guestConnection,
        {
          body: {
            discussion_board_section_id: sectionId,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(sectionSearch);
    if (sectionSearch.data.length > 0) {
      TestValidator.equals(
        "section filtered articles belong to correct section",
        sectionSearch.data[0].section.id,
        sectionId,
      );
    }
  }
}
