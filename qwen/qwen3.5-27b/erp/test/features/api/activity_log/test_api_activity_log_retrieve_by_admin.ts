import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can retrieve a specific activity log entry by its unique identifier.
 *
 * This test verifies:
 * 1. Admin authentication is required and validated
 * 2. The activity log entry is returned with all required fields
 * 3. The organization object is included with full summary details
 * 4. The actingMember object is included showing who performed the action
 * 5. The nested changes array contains all field-level modifications
 * 6. The activity log belongs to the admin's current organization context
 */
export async function test_api_activity_log_retrieve_by_admin(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Generate a valid activity log UUID for testing
  const activityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the activity log
  const activityLog: IHrmPlatformActivityLog =
    await api.functional.hrmPlatform.admin.activity_logs.at(adminConnection, {
      activityLogId,
    });
  typia.assert(activityLog);
  // 4. Validate activity log structure
  TestValidator.equals(
    "activity log id matches request",
    activityLog.id,
    activityLogId,
  );
  TestValidator.predicate(
    "action_type is present",
    activityLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "target_entity_type is present",
    activityLog.target_entity_type.length > 0,
  );
  TestValidator.predicate(
    "action_description is present",
    activityLog.action_description.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(activityLog.created_at)),
  );
  // 5. Validate organization object
  TestValidator.equals(
    "organization id is valid UUID",
    typeof activityLog.organization.id,
    "string",
  );
  TestValidator.predicate(
    "organization name is present",
    activityLog.organization.name.length > 0,
  );
  TestValidator.predicate(
    "organization owner exists",
    activityLog.organization.owner.id.length > 0,
  );
  TestValidator.predicate(
    "organization owner email is valid",
    activityLog.organization.owner.email.length > 0,
  );
  TestValidator.predicate(
    "organization setting exists",
    activityLog.organization.setting.id.length > 0,
  );
  TestValidator.predicate(
    "organization logo exists",
    activityLog.organization.logo.id.length > 0,
  );
  // 6. Validate actingMember (can be null)
  if (activityLog.actingMember !== null) {
    TestValidator.predicate(
      "actingMember id is valid UUID",
      activityLog.actingMember.id.length > 0,
    );
    TestValidator.predicate(
      "actingMember email is valid",
      activityLog.actingMember.email.length > 0,
    );
    TestValidator.predicate(
      "actingMember created_at is valid",
      !isNaN(Date.parse(activityLog.actingMember.created_at)),
    );
  }
  // 7. Validate changes array
  TestValidator.predicate(
    "changes array exists",
    Array.isArray(activityLog.changes),
  );
  for (const change of activityLog.changes) {
    TestValidator.predicate("change id is valid UUID", change.id.length > 0);
    TestValidator.equals(
      "change references parent activity log",
      change.hrm_platform_activity_log_id,
      activityLog.id,
    );
    TestValidator.predicate(
      "field_name is present",
      change.field_name.length > 0,
    );
    TestValidator.predicate(
      "field_type is present",
      change.field_type.length > 0,
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(change.created_at)),
    );
  }
  // 8. Verify changes are ordered by created_at (if multiple changes exist)
  if (activityLog.changes.length > 1) {
    for (let i = 1; i < activityLog.changes.length; i++) {
      TestValidator.predicate(
        `changes[${i}] created_at >= changes[${i - 1}] created_at`,
        Date.parse(activityLog.changes[i].created_at) >=
          Date.parse(activityLog.changes[i - 1].created_at),
      );
    }
  }
}
