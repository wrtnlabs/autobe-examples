import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_maintenance_windows_create } from "../../../generate/generate_random_community_platform_admin_maintenance_windows_create";
import { prepare_random_community_platform_maintenance_window } from "../../../prepare/prepare_random_community_platform_maintenance_window";

export async function test_api_maintenance_window_admin_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. 管理员认证
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. 创建维护窗口用于测试
  const maintenanceWindow =
    await generate_random_community_platform_admin_maintenance_windows_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          maintenance_type: "planned",
          scheduled_start: new Date(Date.now() + 86400000).toISOString(),
          scheduled_end: new Date(Date.now() + 172800000).toISOString(),
          notification_message: RandomGenerator.content({ paragraphs: 1 }),
          impact_level: "medium",
          affected_services: "auth,api,database",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(maintenanceWindow);
  // 3. 仅更新部分字段（title和description）
  const updatedMaintenanceWindow =
    await api.functional.communityPlatform.admin.maintenance_windows.update(
      adminConnection,
      {
        maintenanceWindowId: maintenanceWindow.id,
        body: {
          title: "Updated " + RandomGenerator.paragraph({ sentences: 1 }),
          description: "Updated " + RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformMaintenanceWindow.IUpdate,
      },
    );
  typia.assert(updatedMaintenanceWindow);
  // 4. 验证只有更新的字段被修改
  TestValidator.notEquals(
    "title should be updated",
    maintenanceWindow.title,
    updatedMaintenanceWindow.title,
  );
  TestValidator.notEquals(
    "description should be updated",
    maintenanceWindow.description,
    updatedMaintenanceWindow.description,
  );
  // 5. 验证其他字段保持不变
  TestValidator.equals(
    "maintenance_type unchanged",
    maintenanceWindow.maintenance_type,
    updatedMaintenanceWindow.maintenance_type,
  );
  TestValidator.equals(
    "scheduled_start unchanged",
    maintenanceWindow.scheduled_start,
    updatedMaintenanceWindow.scheduled_start,
  );
  TestValidator.equals(
    "scheduled_end unchanged",
    maintenanceWindow.scheduled_end,
    updatedMaintenanceWindow.scheduled_end,
  );
  TestValidator.equals(
    "status unchanged",
    maintenanceWindow.status,
    updatedMaintenanceWindow.status,
  );
  TestValidator.equals(
    "notification_message unchanged",
    maintenanceWindow.notification_message,
    updatedMaintenanceWindow.notification_message,
  );
  TestValidator.equals(
    "impact_level unchanged",
    maintenanceWindow.impact_level,
    updatedMaintenanceWindow.impact_level,
  );
  TestValidator.equals(
    "affected_services unchanged",
    maintenanceWindow.affected_services,
    updatedMaintenanceWindow.affected_services,
  );
  // 6. 验证时间逻辑和updated_at字段
  TestValidator.predicate(
    "scheduled_end after scheduled_start",
    updatedMaintenanceWindow.scheduled_end >
      updatedMaintenanceWindow.scheduled_start,
  );
  TestValidator.notEquals(
    "updated_at should be updated",
    maintenanceWindow.updated_at,
    updatedMaintenanceWindow.updated_at,
  );
}
