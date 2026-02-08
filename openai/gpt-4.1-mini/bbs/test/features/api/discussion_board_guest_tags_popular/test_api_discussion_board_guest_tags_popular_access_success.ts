import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_guest_tags_popular_access_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // Test that an unauthenticated guest user can retrieve a paginated list of popular tags used for article categorization.
  // Validate presence of pagination metadata and list of tag summaries in the response,
  // confirming conformance to IPageIDiscussionBoardTag.ISummary without authorization.
  // Also verify pagination by requesting additional pages if supported.
  // Step 1: Join as a guest to establish guest authorization context
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  // Step 2: Request first page of popular tags without additional pagination params (defaults)
  // Note: The endpoint is GET /discussionBoard/guest/tags/popular with no body
  const firstPage =
    await api.functional.discussionBoard.guest.tags.popular.index(
      guestConnection,
    );
  typia.assert(firstPage);
  // Validation: Check pagination metadata presence and values
  // The pagination must contain: current, limit, records, pages (all numbers, current>=0)
  TestValidator.predicate(
    "pagination object exists and valid",
    () =>
      typeof firstPage.pagination === "object" &&
      typeof firstPage.pagination.current === "number" &&
      firstPage.pagination.current >= 0 &&
      typeof firstPage.pagination.limit === "number" &&
      firstPage.pagination.limit >= 0 &&
      typeof firstPage.pagination.records === "number" &&
      firstPage.pagination.records >= 0 &&
      typeof firstPage.pagination.pages === "number" &&
      firstPage.pagination.pages >= 0,
  );
  // The data property is an array of tag summaries
  TestValidator.predicate("data is array", Array.isArray(firstPage.data));
  // Additional validation: If more than 1 page exists, request second page and validate it similarly
  if (firstPage.pagination.pages > 1) {
    // We assume the API supports pagination parameters as query params, but since our SDK function does not take parameters,
    // we simulate pagination by assuming the endpoint supports a pagination parameter 'page'. However, since it's not specified in SDK,
    // we retest first page since no params are present. This is limitation.
    // In this case, we call the API again, expecting it to return the first (default) page again.
    // Since no param support, we cannot test other pages. We only confirm that re-calling works.
    const secondCall =
      await api.functional.discussionBoard.guest.tags.popular.index(
        guestConnection,
      );
    typia.assert(secondCall);
    TestValidator.equals(
      "second call pagination total pages",
      secondCall.pagination.pages,
      firstPage.pagination.pages,
    );
  }
}
