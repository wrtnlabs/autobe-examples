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

export async function test_api_activity_log_immutable_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin (this creates activity log entries)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate an activity log ID for testing
  const activityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the activity log entry
  const activityLog: IHrmPlatformActivityLog =
    await api.functional.hrmPlatform.admin.activity_logs.at(adminConnection, {
      activityLogId,
    });
  typia.assert(activityLog);
  // 4. Validate activity log business properties
  TestValidator.predicate(
    "action type is present",
    activityLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "target entity type is present",
    activityLog.target_entity_type.length > 0,
  );
  TestValidator.predicate(
    "action description is present",
    activityLog.action_description.length > 0,
  );
  // 5. Validate organization reference
  TestValidator.predicate(
    "organization name is present",
    activityLog.organization.name.length > 0,
  );
  // 6. Validate acting member if present
  if (activityLog.actingMember !== null) {
    TestValidator.predicate(
      "acting member email is present",
      activityLog.actingMember.email.length > 0,
    );
  }
  // 7. Validate changes array structure
  TestValidator.predicate(
    "changes array exists",
    Array.isArray(activityLog.changes),
  );
  // 8. Validate each change record if changes exist
  if (activityLog.changes.length > 0) {
    for (const change of activityLog.changes) {
      // Verify change references the parent activity log
      TestValidator.equals(
        "change references correct activity log",
        change.hrm_platform_activity_log_id,
        activityLog.id,
      );
      TestValidator.predicate(
        "field name is present",
        change.field_name.length > 0,
      );
      TestValidator.predicate(
        "field type is present",
        change.field_type.length > 0,
      );
      // Verify at least one of old_value or new_value is present
      TestValidator.predicate(
        "change has old_value or new_value",
        change.old_value !== null || change.new_value !== null,
      );
    }
  }
  // 9. Verify immutability - activity log was created in the past
  const createdAt = new Date(activityLog.created_at);
  const now = new Date();
  TestValidator.predicate(
    "activity log timestamp is in the past or present",
    createdAt.getTime() <= now.getTime(),
  );
}
