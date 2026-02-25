import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFeedConfig";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_analytics_statistics_with_pagination_and_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(3),
      displayName: RandomGenerator.name(2),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // Step 2: Test basic analytics with pagination
  const basicResult =
    await api.functional.redditClone.owner.analytics.statistics.index(
      ownerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCloneFeedConfig.IRequest,
      },
    );
  typia.assert(basicResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    basicResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", basicResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    basicResult.pagination.pages >= 0,
  );
  TestValidator.predicate("data array exists", Array.isArray(basicResult.data));
  // Step 3: Test analytics with time range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const timeFilteredResult =
    await api.functional.redditClone.owner.analytics.statistics.index(
      ownerConnection,
      {
        body: {
          startDate: pastDate.toISOString(),
          endDate: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IRedditCloneFeedConfig.IRequest,
      },
    );
  typia.assert(timeFilteredResult);
  // Validate time range analytics response
  TestValidator.equals(
    "time range pagination limit",
    timeFilteredResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "time range data has entries",
    timeFilteredResult.data.length > 0,
  );
  // Validate each analytics entry has the required timestamp
  for (const analytics of timeFilteredResult.data) {
    TestValidator.predicate(
      "analytics has generated_at",
      analytics.generated_at !== undefined,
    );
    typia.assert(analytics.generated_at);
  }
}
