import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReportSnapshot";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_snapshots_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve report snapshots with default pagination
  const response =
    await api.functional.redditClone.admin.reports_snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate pages calculation: pages = ceil(records / limit)
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages equals ceil(records / limit)",
    response.pagination.pages,
    expectedPages,
  );
  // 5. If data exists, verify sorting order (newest first by captured_at)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].captured_at).getTime();
      const currDate = new Date(response.data[i].captured_at).getTime();
      TestValidator.predicate(
        `snapshots sorted by captured_at descending at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
  // 6. Verify default pagination values when no query params provided
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
}
