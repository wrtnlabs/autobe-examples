import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationReport";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_reports_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // Request first page with limit 10
  const firstPage: IPageIRedditCloneModerationReport =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page records >= 0",
    firstPage.pagination.records >= 0,
  );
  if (firstPage.pagination.records > 0) {
    TestValidator.predicate(
      "first page pages >= 1",
      firstPage.pagination.pages >= 1,
    );
  }
  // Validate data array size
  TestValidator.predicate(
    "first page data length <= limit",
    firstPage.data.length <= 10,
  );
  // Request second page
  const secondPage: IPageIRedditCloneModerationReport =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate pagination metadata for second page
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  // Validate data arrays are different (pagination works)
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "different pages",
      firstPage.data[0].id,
      secondPage.data[0].id,
    );
  }
  // Test maximum limit (100)
  const maxLimitPage: IPageIRedditCloneModerationReport =
    await api.functional.redditClone.moderation_reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCloneModerationReport.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page limit",
    maxLimitPage.pagination.limit,
    100,
  );
}
