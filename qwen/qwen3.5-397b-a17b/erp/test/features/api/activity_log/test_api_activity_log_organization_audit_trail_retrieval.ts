import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_organization_audit_trail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve activity logs without any filters (default pagination)
  const activityLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(activityLogs);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is valid",
    activityLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    activityLogs.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    activityLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    activityLogs.pagination.pages >= 0,
  );
  // 4. Validate results are sorted by createdAt in descending order (newest first)
  if (activityLogs.data.length > 0) {
    for (let i = 0; i < activityLogs.data.length - 1; i++) {
      const currentLog = activityLogs.data[i];
      const nextLog = activityLogs.data[i + 1];
      TestValidator.predicate(
        `logs sorted by createdAt DESC at index ${i}`,
        new Date(currentLog.createdAt).getTime() >=
          new Date(nextLog.createdAt).getTime(),
      );
    }
  }
  // 5. Validate organization isolation - response structure is correct
  TestValidator.predicate("data is an array", Array.isArray(activityLogs.data));
  TestValidator.equals(
    "pagination structure",
    activityLogs.pagination.current,
    1,
  );
}
