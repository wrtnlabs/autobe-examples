import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can retrieve activity log entries with default pagination settings.
 *
 * This test validates:
 * 1. Admin authentication flow
 * 2. Activity log retrieval with default pagination parameters
 * 3. Response structure validation including pagination metadata
 * 4. Activity log entry structure with all required fields
 * 5. Default sorting order (created_at descending)
 */
export async function test_api_activity_logs_retrieve_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection using connection isolation pattern
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate admin using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // 3. Retrieve activity logs with default pagination (empty body)
  const response = await api.functional.hrmPlatform.admin.activity_logs.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformActivityLog.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 6. Validate each activity log entry structure
  await ArrayUtil.asyncForEach(response.data, async (log, index) => {
    typia.assert(log);
    // Validate required fields exist
    TestValidator.predicate(
      `log[${index}] has valid UUID id`,
      typeof log.id === "string" && log.id.length > 0,
    );
    TestValidator.predicate(
      `log[${index}] has action_type`,
      typeof log.action_type === "string" && log.action_type.length > 0,
    );
    TestValidator.predicate(
      `log[${index}] has target_entity_type`,
      typeof log.target_entity_type === "string" &&
        log.target_entity_type.length > 0,
    );
    TestValidator.predicate(
      `log[${index}] has action_description`,
      typeof log.action_description === "string",
    );
    TestValidator.predicate(
      `log[${index}] has created_at`,
      typeof log.created_at === "string" && log.created_at.length > 0,
    );
    // Validate target_entity_id (optional, can be null or undefined)
    if (log.target_entity_id !== null && log.target_entity_id !== undefined) {
      TestValidator.predicate(
        `log[${index}] target_entity_id is valid UUID string`,
        typeof log.target_entity_id === "string" &&
          log.target_entity_id.length > 0,
      );
    }
    // Validate actingMember is either null or valid summary
    if (log.actingMember !== null) {
      typia.assert(log.actingMember);
      TestValidator.predicate(
        `log[${index}] actingMember has valid UUID id`,
        typeof log.actingMember!.id === "string" &&
          log.actingMember!.id.length > 0,
      );
      TestValidator.predicate(
        `log[${index}] actingMember has valid email`,
        typeof log.actingMember!.email === "string" &&
          log.actingMember!.email.includes("@"),
      );
      TestValidator.predicate(
        `log[${index}] actingMember has created_at`,
        typeof log.actingMember!.created_at === "string" &&
          log.actingMember!.created_at.length > 0,
      );
    }
  });
  // 7. Validate default sorting (created_at descending) if multiple entries exist
  if (response.data.length > 1) {
    await ArrayUtil.asyncForEach(
      ArrayUtil.repeat(response.data.length - 1, (i) => i),
      async (index) => {
        const currentLog = response.data[index];
        const nextLog = response.data[index + 1];
        const currentDate = new Date(currentLog.created_at).getTime();
        const nextDate = new Date(nextLog.created_at).getTime();
        TestValidator.predicate(
          `logs are sorted by created_at descending at index ${index}`,
          currentDate >= nextDate,
        );
      },
    );
  }
}
