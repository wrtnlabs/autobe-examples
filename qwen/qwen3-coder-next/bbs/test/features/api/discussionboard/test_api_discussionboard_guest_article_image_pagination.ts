import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest article image pagination functionality.
 * Validates the /discussionBoard/guest/articles/{articleId}/images endpoint returns
 * proper pagination structure with current, limit, records, and pages metadata.
 */
export async function test_api_discussionboard_guest_article_image_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  // Test with valid article ID
  const articleId = "123e4567-e89b-12d3-a456-426614174000";
  const response: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.guest.articles.images.index(
      guestConnection,
      {
        articleId,
      },
    );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.predicate("pagination has current", () => {
    return typeof response.pagination.current === "number";
  });
  TestValidator.predicate("pagination has limit", () => {
    return typeof response.pagination.limit === "number";
  });
  TestValidator.predicate("pagination has records", () => {
    return typeof response.pagination.records === "number";
  });
  TestValidator.predicate("pagination has pages", () => {
    return typeof response.pagination.pages === "number";
  });
  // Validate data array structure
  TestValidator.predicate("response has data array", () => {
    return Array.isArray(response.data);
  });
  // Validate pagination calculations for valid page counts
  TestValidator.predicate("pages calculation valid", () => {
    const { records, limit, pages } = response.pagination;
    if (records === 0) {
      return pages === 0;
    }
    return pages === Math.ceil(records / limit);
  });
  // Validate current page is at least 1
  TestValidator.predicate("current page >= 1", () => {
    return response.pagination.current >= 1;
  });
  // Validate limit is positive
  TestValidator.predicate("limit is positive", () => {
    return response.pagination.limit > 0;
  });
  // Validate records is non-negative
  TestValidator.predicate("records is non-negative", () => {
    return response.pagination.records >= 0;
  });
}
