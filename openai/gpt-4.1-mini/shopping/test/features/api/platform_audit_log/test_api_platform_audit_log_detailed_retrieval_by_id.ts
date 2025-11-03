import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAuditLog";
import type { IShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfig";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";

export async function test_api_platform_audit_log_detailed_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin account registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongP@ssw0rd!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody: IShoppingMallAdmin.ILogin = {
    email: adminEmail,
    password: adminJoinBody.password,
    href: "https://admin.platform.local/login",
    referrer: "https://admin.platform.local/",
  };
  const loginInfo: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loginInfo);

  // 3. Create system setting
  const systemSettingCreateBody = {
    key: "audit_log_retention_days",
    value: "30",
    description: "Number of days to retain platform audit logs",
  } satisfies IShoppingMallSystemSetting.ICreate;
  const createdSetting: IShoppingMallSystemSetting =
    await api.functional.shoppingMall.admin.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(createdSetting);

  // 4. Create platform configuration
  const platformConfigCreateBody = {
    config_name: "audit_log_enabled",
    config_value: "true",
    description: "Enable or disable platform audit log feature",
  } satisfies IShoppingMallPlatformConfig.ICreate;
  const createdConfig: IShoppingMallPlatformConfig =
    await api.functional.shoppingMall.admin.platformConfigs.create(connection, {
      body: platformConfigCreateBody,
    });
  typia.assert(createdConfig);

  // 5. Retrieve audit log by id
  // Use the createdSetting.id as a stand-in UUID for testing retrieval
  const auditLogId: string & tags.Format<"uuid"> = createdSetting.id;
  const auditLog: IShoppingMallPlatformAuditLog =
    await api.functional.shoppingMall.admin.platformAuditLogs.at(connection, {
      id: auditLogId,
    });
  typia.assert(auditLog);

  // Business validations
  TestValidator.predicate(
    "audit log id matches requested id",
    auditLog.id === auditLogId,
  );
  TestValidator.predicate(
    "audit log has event_type",
    typeof auditLog.event_type === "string" && auditLog.event_type.length > 0,
  );
  TestValidator.predicate(
    "audit log has event_description",
    typeof auditLog.event_description === "string" &&
      auditLog.event_description.length > 0,
  );
  TestValidator.predicate(
    "audit log created_at is valid ISO date-time",
    !isNaN(Date.parse(auditLog.created_at)),
  );
  // shopping_mall_admin_id may be nullable
  if (
    auditLog.shopping_mall_admin_id !== null &&
    auditLog.shopping_mall_admin_id !== undefined
  ) {
    TestValidator.predicate(
      "audit log shopping_mall_admin_id is valid UUID",
      /^[0-9a-fA-F-]{36}$/.test(auditLog.shopping_mall_admin_id),
    );
  }
}
