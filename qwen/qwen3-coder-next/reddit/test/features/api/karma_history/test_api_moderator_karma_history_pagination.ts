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

export async function test_api_moderator_karma_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // Get first page of karma history with pagination parameters
  const firstPage =
    await api.functional.redditPlatform.moderator.karma_histories.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.equals("pagination exists", firstPage.pagination.current, 1);
  TestValidator.predicate("limit is positive", firstPage.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Calculate expected pages
  const expectedPages =
    firstPage.pagination.records > 0
      ? Math.ceil(firstPage.pagination.records / firstPage.pagination.limit)
      : 0;
  TestValidator.equals(
    "pages calculation correct",
    firstPage.pagination.pages,
    expectedPages,
  );
  // Test second page if available
  if (firstPage.pagination.pages > 1) {
    // Get second page with pagination parameters
    const secondPage =
      await api.functional.redditPlatform.moderator.karma_histories.index(
        moderatorConnection,
        {
          body: {},
        },
      );
    typia.assert(secondPage);
    // Validate second page structure
    TestValidator.equals(
      "second page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "same limit",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "same total records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "same total pages",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
  }
}
