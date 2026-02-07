import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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

export async function test_api_article_search_and_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as guest
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // Step 2: Search articles in a section with empty request body
  // The DTO defines IRequest as {} (empty object) with no search parameters
  // This tests the default article listing behavior with pagination
  const searchResult =
    await api.functional.discussionBoard.guest.sections.articles.index(
      guestConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  // Step 3: Validate response structure
  typia.assert(searchResult);
  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    searchResult.pagination !== undefined,
  );
  TestValidator.equals(
    "has valid current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has valid limit",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "has valid records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    searchResult.pagination.pages >= 0,
  );
  // Step 5: Validate data array structure
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  // Step 6: Validate each article summary has required fields
  for (const article of searchResult.data) {
    TestValidator.predicate("article is valid summary", article !== undefined);
  }
}