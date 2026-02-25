import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_audit_reports_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Prepare date range filters (last 30 days)
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = now;
  // 3. Query audit logs with filters
  const page =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          action_type: "user_registration",
          created_at_start: startDate.toISOString(),
          created_at_end: endDate.toISOString(),
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(page);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    page.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(page.data));
  // 5. Validate filter compliance (if any records returned)
  if (page.data.length > 0) {
    for (const log of page.data) {
      TestValidator.equals(
        "action type matches filter",
        log.action_type,
        "user_registration",
      );
      const logDate = new Date(log.created_at);
      TestValidator.predicate(
        "created_at within start range",
        logDate >= startDate,
      );
      TestValidator.predicate(
        "created_at within end range",
        logDate <= endDate,
      );
    }
  }
  // 6. Verify authorization - should fail without superAdmin credentials
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      connection, // base connection without authorization
      {
        body: {
          page: 1 satisfies number as number,
          limit: 1 satisfies number as number,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  });
}
