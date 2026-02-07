import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformKarmaHistory";
import type { IRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaHistory";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_karma_history_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // Test 1: Get all karma history with empty request (no filters)
  const allHistory =
    await api.functional.redditPlatform.moderator.karma_histories.index(
      moderatorConnection,
      {
        body: {} satisfies IRedditPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  // Validate response structure
  TestValidator.predicate(
    "has pagination object",
    typeof allHistory.pagination === "object",
  );
  TestValidator.predicate(
    "has pagination current page",
    typeof allHistory.pagination.current === "number",
  );
  TestValidator.predicate(
    "has pagination limit",
    typeof allHistory.pagination.limit === "number",
  );
  TestValidator.predicate(
    "has pagination records count",
    typeof allHistory.pagination.records === "number",
  );
  TestValidator.predicate(
    "has pagination pages count",
    typeof allHistory.pagination.pages === "number",
  );
  TestValidator.predicate("has data array", Array.isArray(allHistory.data));
  // Test pagination values are valid
  TestValidator.predicate(
    "current page >= 0",
    allHistory.pagination.current >= 0,
  );
  TestValidator.predicate("limit > 0", allHistory.pagination.limit > 0);
  TestValidator.predicate("records >= 0", allHistory.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", allHistory.pagination.pages >= 0);
  // Test 2: Test with explicit pagination parameters
  const paginatedHistory =
    await api.functional.redditPlatform.moderator.karma_histories.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(paginatedHistory);
  TestValidator.equals(
    "pagination current page matches",
    paginatedHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    paginatedHistory.pagination.limit,
    10,
  );
  // Test 3: Test with different pagination settings
  const smallPage =
    await api.functional.redditPlatform.moderator.karma_histories.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals(
    "second page current page is 2",
    smallPage.pagination.current,
    2,
  );
  TestValidator.equals("second page limit is 5", smallPage.pagination.limit, 5);
  // Test 4: Verify data items have expected structure (if any exist)
  if (allHistory.data.length > 0) {
    const firstItem = allHistory.data[0];
    typia.assert(firstItem);
  }
  // Test 5: Test with empty request object (explicitly empty)
  const emptyRequest =
    await api.functional.redditPlatform.moderator.karma_histories.index(
      moderatorConnection,
      {
        body: {} as const,
      },
    );
  typia.assert(emptyRequest);
  TestValidator.equals(
    "empty request returns same structure",
    emptyRequest.pagination.records >= 0,
    true,
  );
  // Test 6: Test boundary conditions
  const boundaryHistory =
    await api.functional.redditPlatform.moderator.karma_histories.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IRedditPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(boundaryHistory);
  TestValidator.equals(
    "single item limit",
    boundaryHistory.pagination.limit,
    1,
  );
  // Test 7: Test very large limit
  const largeLimit =
    await api.functional.redditPlatform.moderator.karma_histories.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 1000,
        } satisfies IRedditPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals(
    "large limit accepted",
    largeLimit.pagination.limit,
    1000,
  );
}
