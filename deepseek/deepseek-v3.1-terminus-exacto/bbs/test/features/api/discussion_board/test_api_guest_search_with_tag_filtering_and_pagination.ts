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

export async function test_api_guest_search_with_tag_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestAuth);
  // Test search with pagination
  const searchRequest = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number,
  } satisfies IDiscussionBoardArticle.IRequest;
  const searchResult = await api.functional.discussionBoard.guest.search.index(
    guestConnection,
    { body: searchRequest },
  );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    searchRequest.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    searchResult.pagination.limit,
    searchRequest.limit ?? 10,
  );
  TestValidator.predicate(
    "records count non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  if (searchResult.data.length > 0) {
    const article = searchResult.data[0];
    TestValidator.predicate("article has id", typeof article.id === "string");
    TestValidator.predicate(
      "article has title",
      typeof article.title === "string",
    );
    TestValidator.predicate(
      "article has author",
      typeof article.author === "object",
    );
    TestValidator.predicate(
      "article has section",
      typeof article.section === "object",
    );
    TestValidator.predicate("article has tags", Array.isArray(article.tags));
    TestValidator.predicate(
      "article has comments count",
      typeof article.comments_count === "number",
    );
    TestValidator.predicate(
      "article has created_at",
      typeof article.created_at === "string",
    );
  }
  // Test different page
  const secondPageRequest = {
    ...searchRequest,
    page: (searchRequest.page ?? 1) + 1,
  } satisfies IDiscussionBoardArticle.IRequest;
  const secondPageResult =
    await api.functional.discussionBoard.guest.search.index(guestConnection, {
      body: secondPageRequest,
    });
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page current page",
    secondPageResult.pagination.current,
    secondPageRequest.page,
  );
  TestValidator.equals(
    "same limit maintained",
    secondPageResult.pagination.limit,
    searchResult.pagination.limit,
  );
  TestValidator.equals(
    "same total records",
    secondPageResult.pagination.records,
    searchResult.pagination.records,
  );
}
