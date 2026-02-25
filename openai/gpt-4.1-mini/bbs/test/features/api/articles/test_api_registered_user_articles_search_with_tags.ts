import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_articles_search_with_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as registered user
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = { Authorization: registeredUser.token.access };
  // 2. Prepare tags filter - fetch a first page without tag filters to get sample tags
  const initialSearchBody: IDiscussionBoardArticle.IRequest = {
    page: 1,
    limit: 10,
  };
  const initialSearchResult =
    await api.functional.discussionBoard.registeredUser.articles.search(
      userConnection,
      { body: initialSearchBody },
    );
  typia.assert(initialSearchResult);
  if (initialSearchResult.data.length < 3) {
    // If there are fewer than 3 articles, run another search without tags
    // and exit silently because tags are insufficient to test multiple filter
    // Just assert the structure
    return;
  }
  // Collect distinct tags from the first 3 articles
  const collectedTagIds = new Set<string>();
  for (const article of initialSearchResult.data.slice(0, 3)) {
    for (const tag of article.tags) {
      collectedTagIds.add(tag.id);
      if (collectedTagIds.size >= 3) break;
    }
    if (collectedTagIds.size >= 3) break;
  }
  if (collectedTagIds.size < 2) {
    // Not enough tags to test multiple filtering
    // Just do a simple search with one tag
    const oneTagId = [...collectedTagIds][0];
    const searchBodyOneTag: IDiscussionBoardArticle.IRequest = {
      tags: [oneTagId],
      page: 1,
      limit: 10,
    };
    const resultOneTag =
      await api.functional.discussionBoard.registeredUser.articles.search(
        userConnection,
        { body: searchBodyOneTag },
      );
    typia.assert(resultOneTag);
    // Validate articles contain the tag
    for (const article of resultOneTag.data) {
      TestValidator.predicate(
        `article ${article.id} has tag ${oneTagId}`,
        article.tags.some((tag) => tag.id === oneTagId),
      );
    }
    return;
  }
  // Use exactly 2 tags for multiple tag filtering
  const tagFilterIds = [...collectedTagIds].slice(0, 2);
  // Compose a keyword from a substring of an article title to test keyword search
  const sampleArticleTitle = initialSearchResult.data[0].title;
  const keyword =
    sampleArticleTitle.length >= 3
      ? sampleArticleTitle.slice(0, 3)
      : sampleArticleTitle;
  const searchBody: IDiscussionBoardArticle.IRequest = {
    search: keyword,
    tags: tagFilterIds,
    page: 1,
    limit: 5,
    sort: "newest",
  };
  const searchResult =
    await api.functional.discussionBoard.registeredUser.articles.search(
      userConnection,
      { body: searchBody },
    );
  typia.assert(searchResult);
  // Validate pagination metadata is correct
  TestValidator.predicate(
    "pagination current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    searchResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination pages is positive or zero",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination record count is positive or zero",
    searchResult.pagination.records >= 0,
  );
  // Verify each article matches all tag filters and keyword
  for (const article of searchResult.data) {
    // Article tags must include all tagFilterIds
    for (const tagId of tagFilterIds) {
      TestValidator.predicate(
        `article ${article.id} includes tag ${tagId}`,
        article.tags.some((tag) => tag.id === tagId),
      );
    }
    // Article title or content should include keyword (title tested as no content in summary)
    TestValidator.predicate(
      `article ${article.id} title includes keyword`,
      article.title.includes(keyword),
    );
    // Additional checks: commentCount and createdAt exist
    TestValidator.predicate(
      `article ${article.id} has non-negative commentCount`,
      article.commentCount >= 0,
    );
    TestValidator.predicate(
      `article ${article.id} createdAt is not empty`,
      typeof article.createdAt === "string" && article.createdAt.length > 0,
    );
  }
  // Check filtering reduces result set
  const searchResultOneTag =
    await api.functional.discussionBoard.registeredUser.articles.search(
      userConnection,
      { body: { tags: [tagFilterIds[0]], page: 1, limit: 10 } },
    );
  typia.assert(searchResultOneTag);
  TestValidator.predicate(
    "result count with multiple tags less or equal single tag result",
    searchResult.data.length <= searchResultOneTag.data.length,
  );
}
