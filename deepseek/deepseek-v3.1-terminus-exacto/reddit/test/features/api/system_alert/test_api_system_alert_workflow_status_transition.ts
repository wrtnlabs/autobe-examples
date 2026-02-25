import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlert";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_alert_workflow_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Assume a pre-existing system alert with 'new' status
  // In a real environment, this would be seeded in the database
  const systemAlertId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // 3. Transition: new → acknowledged
  const acknowledgedUpdate = {
    status: "acknowledged",
  } satisfies ICommunityPlatformSystemAlert.IUpdate;
  const acknowledgedAlert =
    await api.functional.communityPlatform.admin.system_alerts.update(
      adminConnection,
      {
        systemAlertId,
        body: acknowledgedUpdate,
      },
    );
  typia.assert(acknowledgedAlert);
  TestValidator.equals(
    "status should be acknowledged",
    acknowledgedAlert.status,
    "acknowledged",
  );
  TestValidator.predicate(
    "acknowledged_at should be set",
    acknowledgedAlert.acknowledged_at !== null &&
      acknowledgedAlert.acknowledged_at !== undefined,
  );
  TestValidator.equals(
    "resolved_at should remain null",
    acknowledgedAlert.resolved_at,
    null,
  );
  TestValidator.equals(
    "resolution_notes should be null",
    acknowledgedAlert.resolution_notes,
    null,
  );
  // 4. Transition: acknowledged → investigating
  const investigatingUpdate = {
    status: "investigating",
  } satisfies ICommunityPlatformSystemAlert.IUpdate;
  const investigatingAlert =
    await api.functional.communityPlatform.admin.system_alerts.update(
      adminConnection,
      {
        systemAlertId,
        body: investigatingUpdate,
      },
    );
  typia.assert(investigatingAlert);
  TestValidator.equals(
    "status should be investigating",
    investigatingAlert.status,
    "investigating",
  );
  TestValidator.predicate(
    "acknowledged_at should remain set",
    investigatingAlert.acknowledged_at !== null &&
      investigatingAlert.acknowledged_at !== undefined,
  );
  TestValidator.equals(
    "resolved_at should remain null",
    investigatingAlert.resolved_at,
    null,
  );
  TestValidator.equals(
    "resolution_notes should be null",
    investigatingAlert.resolution_notes,
    null,
  );
  TestValidator.equals(
    "acknowledged_at timestamp should not change",
    investigatingAlert.acknowledged_at,
    acknowledgedAlert.acknowledged_at,
  );
  // 5. Transition: investigating → resolved with resolution notes
  const resolutionNotes = RandomGenerator.paragraph({ sentences: 2 });
  const resolvedUpdate = {
    status: "resolved",
    resolution_notes: resolutionNotes,
  } satisfies ICommunityPlatformSystemAlert.IUpdate;
  const resolvedAlert =
    await api.functional.communityPlatform.admin.system_alerts.update(
      adminConnection,
      {
        systemAlertId,
        body: resolvedUpdate,
      },
    );
  typia.assert(resolvedAlert);
  TestValidator.equals(
    "status should be resolved",
    resolvedAlert.status,
    "resolved",
  );
  TestValidator.predicate(
    "acknowledged_at should remain set",
    resolvedAlert.acknowledged_at !== null &&
      resolvedAlert.acknowledged_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at should be set",
    resolvedAlert.resolved_at !== null &&
      resolvedAlert.resolved_at !== undefined,
  );
  TestValidator.equals(
    "resolution_notes should match",
    resolvedAlert.resolution_notes,
    resolutionNotes,
  );
  TestValidator.equals(
    "acknowledged_at timestamp should not change",
    resolvedAlert.acknowledged_at,
    investigatingAlert.acknowledged_at,
  );
  // 6. Verify immutable fields remain unchanged across all transitions
  // Since we cannot retrieve the original alert, we compare fields between states
  // They should remain identical as we didn't update them
  TestValidator.equals(
    "alert_type should remain consistent",
    acknowledgedAlert.alert_type,
    investigatingAlert.alert_type,
  );
  TestValidator.equals(
    "alert_type should remain consistent",
    investigatingAlert.alert_type,
    resolvedAlert.alert_type,
  );
  TestValidator.equals(
    "severity should remain consistent",
    acknowledgedAlert.severity,
    investigatingAlert.severity,
  );
  TestValidator.equals(
    "severity should remain consistent",
    investigatingAlert.severity,
    resolvedAlert.severity,
  );
  TestValidator.equals(
    "title should remain consistent",
    acknowledgedAlert.title,
    investigatingAlert.title,
  );
  TestValidator.equals(
    "title should remain consistent",
    investigatingAlert.title,
    resolvedAlert.title,
  );
}
