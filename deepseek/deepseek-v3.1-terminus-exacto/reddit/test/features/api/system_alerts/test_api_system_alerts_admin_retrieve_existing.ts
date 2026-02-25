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

export async function test_api_system_alerts_admin_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Generate a random system alert ID
  const systemAlertId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the system alert
  try {
    const alert = await api.functional.communityPlatform.admin.system_alerts.at(
      adminConnection,
      { systemAlertId },
    );
    // 4. If retrieval succeeds (alert exists), validate all fields
    typia.assert(alert);
    // Validate all required fields are present
    TestValidator.predicate(
      "alert should have all expected fields",
      !!alert.alert_type &&
        !!alert.severity &&
        !!alert.status &&
        !!alert.title &&
        !!alert.description &&
        !!alert.source_component &&
        !!alert.created_at &&
        !!alert.updated_at,
    );
    // Validate field types
    TestValidator.equals(
      "id should match requested ID",
      alert.id,
      systemAlertId,
    );
    TestValidator.predicate(
      "created_at should be valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(alert.created_at),
    );
    TestValidator.predicate(
      "updated_at should be valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(alert.updated_at),
    );
    // Validate nullable fields can be null
    TestValidator.predicate(
      "acknowledged_at is nullable",
      alert.acknowledged_at === null ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(alert.acknowledged_at),
    );
    TestValidator.predicate(
      "resolved_at is nullable",
      alert.resolved_at === null ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(alert.resolved_at),
    );
    TestValidator.predicate(
      "resolution_notes is nullable",
      alert.resolution_notes === null ||
        typeof alert.resolution_notes === "string",
    );
  } catch (error) {
    // 5. If alert doesn't exist (expected), validate it's a 404 error
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals("should be 404 Not Found", error.status, 404);
    } else {
      throw error;
    }
  }
}
