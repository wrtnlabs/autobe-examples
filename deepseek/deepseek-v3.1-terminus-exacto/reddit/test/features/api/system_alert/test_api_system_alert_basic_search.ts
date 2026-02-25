import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlert";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemAlert";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_alert_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Test basic search with empty filters (retrieve all alerts)
  const page = await api.functional.communityPlatform.admin.system_alerts.index(
    adminConnection,
    {
      body: {} satisfies ICommunityPlatformSystemAlert.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination has current page",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  // 4. Validate sorting: severity (critical→high→medium→low) then created_at descending
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  for (let i = 1; i < page.data.length; i++) {
    const prev = page.data[i - 1];
    const curr = page.data[i];
    // Get severity values with safe access
    const prevSeverity =
      severityOrder[prev.severity as keyof typeof severityOrder];
    const currSeverity =
      severityOrder[curr.severity as keyof typeof severityOrder];
    // Skip comparison if either severity is not in our defined order
    if (prevSeverity === undefined || currSeverity === undefined) {
      continue;
    }
    // Either previous severity is higher priority (lower number) OR
    // Same severity but previous created_at is more recent (greater timestamp)
    TestValidator.predicate(
      `alert ${i} sorted correctly by severity and time`,
      prevSeverity < currSeverity ||
        (prevSeverity === currSeverity && prev.created_at >= curr.created_at),
    );
  }
  // 5. Test unauthorized access - should fail
  // Create a clean connection with no Authorization header
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.communityPlatform.admin.system_alerts.index(
      unauthorizedConnection,
      {
        body: {} satisfies ICommunityPlatformSystemAlert.IRequest,
      },
    );
  });
}
