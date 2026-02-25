import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function test_api_discussion_board_guest_search_articles_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join to obtain authorization
  const guestConnection: api.IConnection = { host: connection.host };
  const joinBody: IDiscussionBoardGuest.IJoin = {
    deviceFingerprint: RandomGenerator.alphaNumeric(16),
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    ipAddress: "127.0.0.1",
    anonymousId: RandomGenerator.alphaNumeric(12),
  };
  const authorized: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(guestConnection, { body: joinBody });
  // Update authorization header with access token
  guestConnection.headers = { Authorization: authorized.token.access };
  // 2. Call the patch /discussionBoard/guest/search/articles endpoint with empty body
  const searchBody: IDiscussionBoardArticle.IRequest = {
    // minimal request to get paginated article summary list
    search: null,
    sectionId: null,
    tags: null,
    page: 1,
    limit: 10,
    sort: null,
  };
  const pageSummary =
    await api.functional.discussionBoard.guest.search.articles.index(
      guestConnection,
      { body: searchBody },
    );
  typia.assert(pageSummary);
  // 3. Validate pagination info
  TestValidator.predicate(
    "pagination current >= 1",
    pageSummary.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    pageSummary.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    pageSummary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    pageSummary.pagination.pages >= 0,
  );
  // 4. Validate article list
  TestValidator.predicate(
    "article list is array",
    Array.isArray(pageSummary.data),
  );
  for (const article of pageSummary.data) {
    typia.assert(article);
    // Basic field presence
    TestValidator.predicate("article id is not empty", article.id.length > 0);
    TestValidator.predicate(
      "article title is not empty",
      article.title.length > 0,
    );
    // author summary
    TestValidator.predicate(
      "author id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        article.author.id,
      ),
    );
    TestValidator.predicate(
      "author displayName not empty",
      article.author.displayName.length > 0,
    );
    // section summary exist (treated as an object - may be empty)
    TestValidator.predicate(
      "section is object",
      article.section !== null && typeof article.section === "object",
    );
    // commentCount is number >= 0
    TestValidator.predicate(
      "commentCount >= 0",
      typeof article.commentCount === "number" && article.commentCount >= 0,
    );
    // tags array
    TestValidator.predicate("tags is array", Array.isArray(article.tags));
    for (const tag of article.tags) {
      typia.assert(tag);
      TestValidator.predicate(
        "tag id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          tag.id,
        ),
      );
      TestValidator.predicate(
        "tag discussionBoardArticleId matches article id",
        tag.discussionBoardArticleId === article.id,
      );
      TestValidator.predicate(
        "tag discussionBoardTagId is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          tag.discussionBoardTagId,
        ),
      );
    }
    // createdAt ISO date string
    TestValidator.predicate(
      "createdAt is ISO date-time",
      typeof article.createdAt === "string" &&
        !isNaN(Date.parse(article.createdAt)),
    );
  }
  // 5. Validate ordering by newest first (if there are multiple articles)
  if (pageSummary.data.length > 1) {
    for (let i = 1; i < pageSummary.data.length; i++) {
      const prev = new Date(pageSummary.data[i - 1].createdAt);
      const curr = new Date(pageSummary.data[i].createdAt);
      TestValidator.predicate(
        "articles sorted by newest first",
        prev.getTime() >= curr.getTime(),
      );
    }
  }
}
