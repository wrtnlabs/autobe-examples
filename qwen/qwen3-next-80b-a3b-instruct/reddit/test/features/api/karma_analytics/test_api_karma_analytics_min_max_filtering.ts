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
export async function test_api_karma_analytics_min_max_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the required utility function
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Set up the request body for karma analytics with min/max filtering
  const request: ICommunityBbsUserKarma.IRequest = {
    minKarma: 1000,
    maxKarma: 5000,
  } satisfies ICommunityBbsUserKarma.IRequest;
  // Call the karma analytics endpoint with the admin connection
  const result: IPageICommunityBbsUserKarma.ISummary =
    await api.functional.communityBbs.admin.analytics.users.karma.index(
      adminConnection, // Use the admin connection, NOT the base connection
      { body: request },
    );
  typia.assert(result);
  // Validate the pagination information
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  // Validate that all returned users have karma scores within the specified range
  for (const user of result.data) {
    TestValidator.predicate(
      "user karma score >= 1000",
      user.total_score >= 1000,
    );
    TestValidator.predicate(
      "user karma score <= 5000",
      user.total_score <= 5000,
    );
  }
  // Validate that minimum karma score in results is >= 1000 and maximum is <= 5000
  if (result.data.length > 0) {
    const minKarmaInResults = Math.min(
      ...result.data.map((u) => u.total_score),
    );
    const maxKarmaInResults = Math.max(
      ...result.data.map((u) => u.total_score),
    );
    TestValidator.predicate(
      "minimum karma score >= 1000",
      minKarmaInResults >= 1000,
    );
    TestValidator.predicate(
      "maximum karma score <= 5000",
      maxKarmaInResults <= 5000,
    );
  }
  // Verify that at least one user was returned
  TestValidator.predicate("at least one user returned", result.data.length > 0);
}
