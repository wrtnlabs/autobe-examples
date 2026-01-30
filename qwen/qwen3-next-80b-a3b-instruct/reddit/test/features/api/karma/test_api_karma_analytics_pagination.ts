import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserKarma";
import type { ILastUpdateDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/ILastUpdateDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserKarma";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_analytics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Define karma range filter parameters for pagination test
  const paginatedRequest: ICommunityBbsUserKarma.IRequest = {
    minKarma: 100,
    maxKarma: 500,
    page: 2,
    limit: 10,
  } satisfies ICommunityBbsUserKarma.IRequest;
  // Step 3: Call karma analytics endpoint with pagination parameters
  const result: IPageICommunityBbsUserKarma.ISummary =
    await api.functional.communityBbs.admin.analytics.users.karma.index(
      adminConnection,
      {
        body: paginatedRequest,
      },
    );
  typia.assert(result);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "current page should be 2",
    result.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "records count should be greater than 0",
    result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages should be greater than 1",
    result.pagination.pages > 1,
  );
  // Step 5: Validate that all returned users have karma scores within requested range (100-500)
  for (const user of result.data) {
    TestValidator.predicate(
      "user karma should be >= 100",
      user.total_score >= 100,
    );
    TestValidator.predicate(
      "user karma should be <= 500",
      user.total_score <= 500,
    );
  }
}
