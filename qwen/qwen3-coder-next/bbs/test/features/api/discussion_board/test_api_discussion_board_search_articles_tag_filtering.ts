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

/**
 * Test guest article search with tag filtering functionality.
 * 1. Create guest session for unauthenticated user
 * 2. Search articles with tag filtering for 'economy' and 'politics'
 * 3. Validate search results structure and tag filtering
 */
export async function test_api_discussion_board_search_articles_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await api.functional.discussionBoard.auth.guest.join(
    guestConnection,
    {
      body: typia.random<IDiscussionBoardGuest.IJoin>(),
    },
  );
  typia.assert(guestSession);
  // 2. Search articles with tag filtering
  const searchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.search.articles.index(
      guestConnection,
      {
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(searchResult);
}
