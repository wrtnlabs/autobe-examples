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

export async function test_api_discussion_board_guest_tags_popular_repeated_requests_consistency(
  connection: api.IConnection,
): Promise<void> {
  // This test validates that the popular tags endpoint for guests returns consistent and stable results
  // over multiple sequential requests without authentication.
  // 1. Join as guest to obtain guest token and authorized connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  // 2. Make multiple sequential GET requests to /discussionBoard/guest/tags/popular
  const requestCount = 5;
  const popularTagsResponses: IPageIDiscussionBoardTag.ISummary[] = [];
  for (let i = 0; i < requestCount; i++) {
    const start = Date.now();
    const response =
      await api.functional.discussionBoard.guest.tags.popular.index(
        guestConnection,
      );
    const duration = Date.now() - start;
    typia.assert(response);
    // Validate the pagination object exists and has sensible values
    const pagination = response.pagination;
    TestValidator.predicate(
      `pagination current page >= 1`,
      pagination.current >= 1,
    );
    TestValidator.predicate(`pagination limit >= 1`, pagination.limit >= 1);
    TestValidator.predicate(`pagination records >= 0`, pagination.records >= 0);
    TestValidator.predicate(`pagination pages >= 0`, pagination.pages >= 0);
    // Validate each tag entry is well-formed
    for (const tag of response.data) {
      typia.assert(tag);
    }
    // Validate response time is within acceptable bounds (e.g., 5 seconds)
    TestValidator.predicate(`response time within 5000ms`, duration <= 5000);
    popularTagsResponses.push(response);
  }
  // 3. Confirm that all fetched popular tags responses are deeply equal to the first response
  for (let i = 1; i < popularTagsResponses.length; i++) {
    TestValidator.equals(
      `popular tags response ${i + 1} equals first response`,
      popularTagsResponses[0],
      popularTagsResponses[i],
    );
  }
}
