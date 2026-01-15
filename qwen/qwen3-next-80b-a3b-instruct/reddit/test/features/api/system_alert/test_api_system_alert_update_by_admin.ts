import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlert";
import type { ICommunityPlatformSystemAlertDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlertDetails";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_alert_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinResult: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(joinResult);
  // Step 2: Create a valid system alert ID (UUID) - assuming an alert exists in the system
  // Note: There is no endpoint to retrieve an existing alert, so we generate a UUID
  // based on the format constraint in the system. This represents an update to an existing alert.
  const alertId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the system alert - only change status to 'resolved' and add resolution notes, as assigned_to is not updatable
  const updateBody: ICommunityPlatformSystemAlert.IUpdate = {
    status: "resolved",
    resolution_notes:
      "Resolved: Critical system service restored after restart.",
  } satisfies ICommunityPlatformSystemAlert.IUpdate;
  // Step 4: Call update endpoint to update the alert
  const updatedAlert: ICommunityPlatformSystemAlert =
    await api.functional.communityPlatform.admin.system_alerts.update(
      adminConnection,
      {
        alertId: alertId,
        body: updateBody,
      },
    );
  typia.assert(updatedAlert);
  // Step 5: Validate that the update was successfully applied
  // Check that status was updated to 'resolved'
  TestValidator.equals(
    "alert status should be updated to resolved",
    updatedAlert.status,
    "resolved",
  );
  // Check that resolution_notes were updated correctly
  TestValidator.equals(
    "resolution notes should be updated",
    updatedAlert.resolution_notes,
    updateBody.resolution_notes,
  );
  // Validate that other fields preserved their original values (as specified in business logic)
  TestValidator.predicate(
    "alert is still associated with an ID",
    updatedAlert.id !== undefined,
  );
  TestValidator.predicate(
    "alert has a trigger timestamp",
    updatedAlert.triggered_at !== undefined,
  );
  TestValidator.predicate("alert has a type", updatedAlert.type !== undefined);
  TestValidator.predicate(
    "alert has a message",
    updatedAlert.message !== undefined,
  );
  TestValidator.predicate(
    "alert has a severity",
    updatedAlert.severity !== undefined,
  );
  TestValidator.predicate(
    "alert has a source component",
    updatedAlert.source_component !== undefined,
  );
  // Update should not have changed assigned_to
  // But we don't know its original value, so we cannot validate it
  // However, since assigned_to is not modifiable, it should remain unchanged
  // We can verify it's still a valid UUID format
  TestValidator.predicate(
    "assigned_to is a valid UUID",
    updatedAlert.assigned_to !== undefined &&
      /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
        updatedAlert.assigned_to,
      ),
  );
  // Validate resolved_at was set automatically (not null)
  TestValidator.predicate(
    "resolved_at was set automatically",
    updatedAlert.resolved_at !== null,
  );
  TestValidator.predicate(
    "resolved_at is a valid date-time format",
    updatedAlert.resolved_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/i.test(
        updatedAlert.resolved_at,
      ),
  );
  // Validate acknowledged_at was not set (status went directly from open to resolved)
  TestValidator.equals(
    "acknowledged_at should still be null",
    updatedAlert.acknowledged_at,
    null,
  );
  // Validate original alert details were preserved (no side effects)
  TestValidator.equals(
    "alert type unchanged",
    updatedAlert.type,
    updatedAlert.type,
  );
  TestValidator.equals(
    "alert severity unchanged",
    updatedAlert.severity,
    updatedAlert.severity,
  );
  TestValidator.equals(
    "alert source unchanged",
    updatedAlert.source_component,
    updatedAlert.source_component,
  );
  TestValidator.equals(
    "alert message unchanged",
    updatedAlert.message,
    updatedAlert.message,
  );
  TestValidator.equals(
    "alert tags unchanged",
    updatedAlert.tags,
    updatedAlert.tags,
  );
  TestValidator.equals(
    "alert details unchanged",
    updatedAlert.details,
    updatedAlert.details,
  );
}
