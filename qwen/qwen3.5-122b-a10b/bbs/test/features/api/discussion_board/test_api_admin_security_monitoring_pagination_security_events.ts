import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthenticationMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthenticationMetric";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRangePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRangePeriod";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSecurityMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityMonitoring";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityMonitoring";
import type { ISecurityAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ISecurityAlert";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_security_monitoring_pagination_security_events(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test pagination with page 1, limit 10
  const page1Response =
    await api.functional.discussionBoard.admin.monitoring.security.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityMonitoring.IRequest,
      },
    );
  typia.assert(page1Response);
  // 3. Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has valid records",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has valid pages",
    page1Response.pagination.pages >= 0,
  );
  // 4. Test pagination with page 2, limit 5
  const page2Response =
    await api.functional.discussionBoard.admin.monitoring.security.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSecurityMonitoring.IRequest,
      },
    );
  typia.assert(page2Response);
  // 5. Validate pagination metadata for page 2
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 has valid records",
    page2Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 2 has valid pages",
    page2Response.pagination.pages >= 0,
  );
  // 6. Test pagination with different limit (20)
  const limit20Response =
    await api.functional.discussionBoard.admin.monitoring.security.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSecurityMonitoring.IRequest,
      },
    );
  typia.assert(limit20Response);
  // 7. Validate pagination metadata for limit 20
  TestValidator.equals(
    "limit 20 current",
    limit20Response.pagination.current,
    1,
  );
  TestValidator.equals("limit 20 limit", limit20Response.pagination.limit, 20);
  TestValidator.predicate(
    "limit 20 has valid records",
    limit20Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "limit 20 has valid pages",
    limit20Response.pagination.pages >= 0,
  );
  // 8. Verify security events array respects limit (with null checks)
  if (page1Response.data.length > 0) {
    TestValidator.predicate(
      "page 1 security events within limit",
      page1Response.data[0].security_events.length <= 10,
    );
  }
  if (page2Response.data.length > 0) {
    TestValidator.predicate(
      "page 2 security events within limit",
      page2Response.data[0].security_events.length <= 5,
    );
  }
  if (limit20Response.data.length > 0) {
    TestValidator.predicate(
      "limit 20 security events within limit",
      limit20Response.data[0].security_events.length <= 20,
    );
  }
  // 9. Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination pages calculated correctly",
    page1Response.pagination.pages ===
      (page1Response.pagination.limit > 0
        ? Math.ceil(
            page1Response.pagination.records / page1Response.pagination.limit,
          )
        : 0),
  );
}
