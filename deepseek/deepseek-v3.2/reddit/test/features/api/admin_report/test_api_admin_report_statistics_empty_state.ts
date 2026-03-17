import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_report_statistics_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Query report statistics with default pagination
  // Admin has no moderation privileges yet, so should see zero reports
  const statistics =
    await api.functional.communityPlatform.admin.reports.statistics.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(statistics);
  // Validate empty state
  TestValidator.equals(
    "pagination records should be zero",
    statistics.pagination.records,
    0,
  );
  TestValidator.equals("data array should be empty", statistics.data.length, 0);
  TestValidator.equals(
    "current page should be 1",
    statistics.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", statistics.pagination.limit, 20);
  TestValidator.equals(
    "total pages should be 0",
    statistics.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "all pagination values should be non-negative",
    statistics.pagination.current >= 0 &&
      statistics.pagination.limit >= 0 &&
      statistics.pagination.records >= 0 &&
      statistics.pagination.pages >= 0,
  );
}
