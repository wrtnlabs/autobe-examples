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

export async function test_api_article_trending_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guestToken = await authorize_guest_join(guestConnection, {
    body: {},
  });
  // Test trending articles with empty request body (no pagination parameters in DTO)
  const result =
    await api.functional.discussionBoard.guest.articles.trending.index(
      guestConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination structure exists
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
  // Validate pagination fields (using typia.assert for comprehensive validation)
  TestValidator.equals(
    "current page >= 1",
    result.pagination.current >= 1,
    true,
  );
  TestValidator.equals("limit > 0", result.pagination.limit > 0, true);
  TestValidator.equals("records >= 0", result.pagination.records >= 0, true);
  TestValidator.equals("pages >= 0", result.pagination.pages >= 0, true);
  // Validate data array
  TestValidator.equals("data is array", Array.isArray(result.data), true);
}
