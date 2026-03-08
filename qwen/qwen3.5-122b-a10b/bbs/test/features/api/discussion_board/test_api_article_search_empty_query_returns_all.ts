import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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

export async function test_api_article_search_empty_query_returns_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphabets(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Search with empty query (no search parameter)
  const emptySearchResult =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    emptySearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    emptySearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    emptySearchResult.pagination.pages >= 0,
  );
  // 4. Verify article summaries structure
  if (emptySearchResult.data.length > 0) {
    const firstArticle = emptySearchResult.data[0];
    typia.assert(firstArticle);
    // Verify required fields exist
    TestValidator.predicate("article has id", firstArticle.id.length > 0);
    TestValidator.predicate("article has title", firstArticle.title.length > 0);
    TestValidator.predicate("article has author", firstArticle.author !== null);
    TestValidator.predicate(
      "article has section",
      firstArticle.section !== null,
    );
    TestValidator.predicate(
      "article has tags array",
      Array.isArray(firstArticle.tags),
    );
    TestValidator.predicate(
      "article has comments count",
      firstArticle.comments_count >= 0,
    );
    TestValidator.predicate(
      "article has created_at",
      firstArticle.created_at.length > 0,
    );
    TestValidator.predicate(
      "article has updated_at",
      firstArticle.updated_at.length > 0,
    );
    TestValidator.predicate(
      "article deleted_at is null or date",
      firstArticle.deleted_at === null || firstArticle.deleted_at.length > 0,
    );
    // Verify author summary structure
    typia.assert(firstArticle.author);
    TestValidator.predicate("author has id", firstArticle.author.id.length > 0);
    TestValidator.predicate(
      "author has displayName",
      firstArticle.author.displayName.length > 0,
    );
    // Verify section summary structure
    typia.assert(firstArticle.section);
    TestValidator.predicate(
      "section has id",
      firstArticle.section.id.length > 0,
    );
    TestValidator.predicate(
      "section has name",
      firstArticle.section.name.length > 0,
    );
    // Verify tags are summaries
    for (const tag of firstArticle.tags) {
      typia.assert(tag);
      TestValidator.predicate("tag has id", tag.id.length > 0);
      TestValidator.predicate("tag has name", tag.name.length > 0);
    }
  }
  // 5. Test with section_id filter (if we have a section)
  if (emptySearchResult.data.length > 0) {
    const sectionId = emptySearchResult.data[0].section.id;
    const sectionFilteredResult =
      await api.functional.discussionBoard.guest.articles.search(
        guestConnection,
        {
          body: {
            section_id: sectionId,
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(sectionFilteredResult);
    // All results should be from the specified section
    for (const article of sectionFilteredResult.data) {
      TestValidator.equals(
        "article section matches filter",
        article.section.id,
        sectionId,
      );
    }
  }
  // 6. Test with author_id filter (if we have an author)
  if (emptySearchResult.data.length > 0) {
    const authorId = emptySearchResult.data[0].author.id;
    const authorFilteredResult =
      await api.functional.discussionBoard.guest.articles.search(
        guestConnection,
        {
          body: {
            author_id: authorId,
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(authorFilteredResult);
    // All results should be from the specified author
    for (const article of authorFilteredResult.data) {
      TestValidator.equals(
        "article author matches filter",
        article.author.id,
        authorId,
      );
    }
  }
  // 7. Test sorting - newest first (default)
  const newestResult =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          sort: "newest",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(newestResult);
  // 8. Test sorting - oldest first
  const oldestResult =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          sort: "oldest",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(oldestResult);
  // 9. Test with empty string search (should return all articles like undefined)
  const emptyStringSearchResult =
    await api.functional.discussionBoard.guest.articles.search(
      guestConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptyStringSearchResult);
  // 10. Verify pagination consistency
  TestValidator.equals(
    "pagination current is 1",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is within range",
    emptySearchResult.pagination.limit >= 1 &&
      emptySearchResult.pagination.limit <= 100,
  );
}
