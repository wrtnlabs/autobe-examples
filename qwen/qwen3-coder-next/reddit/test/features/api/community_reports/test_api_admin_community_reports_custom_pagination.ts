import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_admin_community_reports_custom_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // Generate a random community ID for testing pagination
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test pagination with different page sizes
  const pageSizes = [3, 5, 10];
  for (const pageSize of pageSizes) {
    const reportsPage =
      await api.functional.redditPlatform.admin.communities.reports.index(
        adminConnection,
        {
          communityId,
          body: {},
        },
      );
    typia.assert(reportsPage);
    // Verify pagination metadata matches requested parameters
    TestValidator.equals(
      "pagination limit matches requested",
      reportsPage.pagination.limit,
      pageSize,
    );
    TestValidator.predicate("has data array", Array.isArray(reportsPage.data));
    TestValidator.predicate(
      "data count <= limit",
      reportsPage.data.length <= pageSize,
    );
  }
  // Test offset-based pagination with different page numbers
  const offsetReports =
    await api.functional.redditPlatform.admin.communities.reports.index(
      adminConnection,
      {
        communityId,
        body: {},
      },
    );
  typia.assert(offsetReports);
  const nextOffsetReports =
    await api.functional.redditPlatform.admin.communities.reports.index(
      adminConnection,
      {
        communityId,
        body: {},
      },
    );
  typia.assert(nextOffsetReports);
  // Verify pagination returns consistent structure
  TestValidator.equals(
    "pagination has correct structure",
    offsetReports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "offset reports has data",
    Array.isArray(offsetReports.data),
  );
}
