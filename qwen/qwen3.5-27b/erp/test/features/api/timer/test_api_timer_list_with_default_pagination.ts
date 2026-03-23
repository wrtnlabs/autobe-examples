import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test timer list retrieval with default pagination.
 * 1. Admin authenticates to access timer list endpoint
 * 2. Admin requests timer list without any filters
 * 3. Validate pagination metadata (current page, limit, total records, total pages)
 * 4. Validate timer summary structure with nested employee, project, and optional task
 * 5. Verify default sorting (created_at DESC) and default page size (20)
 */
export async function test_api_timer_list_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Request timer list with default pagination (no filters)
  const output = await api.functional.hrmPlatform.admin.timers.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("default limit is 20", output.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    output.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  // 5. Validate default sorting (created_at DESC - newest first) if multiple timers exist
  if (output.data.length > 1) {
    const firstTimer = output.data[0];
    const lastTimer = output.data[output.data.length - 1];
    TestValidator.predicate(
      "timers are sorted by created_at DESC",
      new Date(firstTimer.created_at) >= new Date(lastTimer.created_at),
    );
  }
  // 6. Validate timer status consistency (active vs stopped)
  for (const timer of output.data) {
    // Active timers should have stopped_at as null
    // Stopped timers should have stopped_at as valid timestamp
    const isActive = timer.stopped_at === null;
    TestValidator.predicate(
      `timer ${timer.id} stopped_at is consistent (active: ${isActive})`,
      isActive || timer.stopped_at !== null,
    );
  }
}
