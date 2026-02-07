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

export async function test_api_article_trending_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(guest);
  // 2. Retrieve trending articles
  const trending =
    await api.functional.discussionBoard.guest.articles.trending.index(
      guestConnection,
      {
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(trending);
  // 3. Validate response structure
  typia.assert(trending.pagination);
  typia.assert(trending.data);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "has positive current page",
    trending.pagination.current > 0,
  );
  TestValidator.predicate("has positive limit", trending.pagination.limit > 0);
  TestValidator.predicate(
    "has non-negative records",
    trending.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has non-negative pages",
    trending.pagination.pages >= 0,
  );
  // 5. Validate article summary structure
  if (trending.data.length > 0) {
    typia.assert(trending.data[0]);
  }
}
