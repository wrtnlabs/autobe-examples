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

export async function test_api_discussion_board_search_articles_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Join as guest to get authorization token
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // Search articles as guest
  const searchResult =
    await api.functional.discussionBoard.guest.search.articles.index(
      guestConnection,
      {
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(searchResult);
  // Validate search results structure
  TestValidator.equals(
    "has pagination",
    searchResult.pagination !== null,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  TestValidator.predicate(
    "pagination has required fields",
    searchResult.pagination.current > 0 &&
      searchResult.pagination.limit > 0 &&
      searchResult.pagination.records >= 0,
  );
}
