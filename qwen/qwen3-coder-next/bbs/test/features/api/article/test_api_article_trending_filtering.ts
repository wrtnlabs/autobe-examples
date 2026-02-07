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

export async function test_api_article_trending_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // Update connection with authorization token
  guestConnection.headers = {
    ...guestConnection.headers,
    Authorization: guestAuth.token.access,
  };
  // Test trending article retrieval with request parameters
  const result =
    await api.functional.discussionBoard.guest.articles.trending.index(
      guestConnection,
      {
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // Validate pagination properties
  TestValidator.predicate("current page >= 1", result.pagination.current >= 1);
  TestValidator.predicate("limit > 0", result.pagination.limit > 0);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
}
