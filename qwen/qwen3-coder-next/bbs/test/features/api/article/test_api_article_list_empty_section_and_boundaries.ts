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

export async function test_api_article_list_empty_section_and_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  // Test 1: Empty section with default pagination
  const emptySectionId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.discussionBoard.guest.sections.articles.index(
      guestConnection,
      {
        sectionId: emptySectionId,
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(emptyResult);
  // Verify empty section returns zero records and pages
  TestValidator.equals(
    "empty section has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty section has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty section has empty data array",
    emptyResult.data.length,
    0,
  );
  // Test 2: Boundary condition - page=0 should return page=1
  const pageZeroResult =
    await api.functional.discussionBoard.guest.sections.articles.index(
      guestConnection,
      {
        sectionId: emptySectionId,
        body: {
          page: 0,
        },
      },
    );
  typia.assert(pageZeroResult);
  TestValidator.equals(
    "page=0 returns page=1",
    pageZeroResult.pagination.current,
    1,
  );
  // Test 3: Boundary condition - limit=0 should return default limit
  const limitZeroResult =
    await api.functional.discussionBoard.guest.sections.articles.index(
      guestConnection,
      {
        sectionId: emptySectionId,
        body: {
          limit: 0,
        },
      },
    );
  typia.assert(limitZeroResult);
  // Default limit should be applied (typically 10 or 20 based on implementation)
  TestValidator.predicate(
    "limit=0 uses default limit",
    limitZeroResult.pagination.limit > 0,
  );
  // Test 4: Negative pagination values handling
  const negativePageResult =
    await api.functional.discussionBoard.guest.sections.articles.index(
      guestConnection,
      {
        sectionId: emptySectionId,
        body: {
          page: -1,
          limit: -10,
        },
      },
    );
  typia.assert(negativePageResult);
  // Negative values should be handled gracefully (likely converted to defaults)
  TestValidator.predicate(
    "negative page handled",
    negativePageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "negative limit handled",
    negativePageResult.pagination.limit > 0,
  );
  // Test 5: Beyond last page pagination
  const beyondLastPageResult =
    await api.functional.discussionBoard.guest.sections.articles.index(
      guestConnection,
      {
        sectionId: emptySectionId,
        body: {
          page: 100,
          limit: 10,
        },
      },
    );
  typia.assert(beyondLastPageResult);
  // Beyond last page should return empty data
  TestValidator.equals(
    "beyond last page has empty data",
    beyondLastPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond last page has zero records",
    beyondLastPageResult.pagination.records,
    0,
  );
  // Test 6: Verify pagination navigation calculations
  TestValidator.equals(
    "pages calculation correct",
    emptyResult.pagination.pages,
    Math.ceil(emptyResult.pagination.records / emptyResult.pagination.limit),
  );
}
