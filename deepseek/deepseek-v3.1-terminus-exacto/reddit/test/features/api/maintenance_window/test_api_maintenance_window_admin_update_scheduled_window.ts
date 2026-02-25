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

export async function test_api_maintenance_window_admin_update_scheduled_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建管理员连接并进行认证
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. 创建初始维护窗口
  const maintenanceWindow =
    await api.functional.communityPlatform.admin.maintenance_windows.create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          maintenance_type: "planned",
          scheduled_start: new Date(Date.now() + 86400000).toISOString(), // 明天
          scheduled_end: new Date(Date.now() + 172800000).toISOString(), // 后天
          notification_message: RandomGenerator.paragraph({ sentences: 3 }),
          impact_level: "medium",
          affected_services: "api,database,frontend",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(maintenanceWindow);
  // 3. 验证初始状态为'scheduled'
  TestValidator.equals(
    "initial status should be scheduled",
    maintenanceWindow.status,
    "scheduled",
  );
  // 4. 准备更新数据
  const updateData: ICommunityPlatformMaintenanceWindow.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    scheduled_end: new Date(Date.now() + 259200000).toISOString(), // 3天后
    notification_message: RandomGenerator.paragraph({ sentences: 4 }),
    impact_level: "high",
    affected_services: "api,database,frontend,queue",
  };
  // 5. 更新维护窗口
  const updatedWindow =
    await api.functional.communityPlatform.admin.maintenance_windows.update(
      adminConnection,
      {
        maintenanceWindowId: maintenanceWindow.id,
        body: updateData,
      },
    );
  typia.assert(updatedWindow);
  // 6. 验证更新后的字段
  TestValidator.equals(
    "title should be updated",
    updatedWindow.title,
    updateData.title,
  );
  TestValidator.equals(
    "description should be updated",
    updatedWindow.description,
    updateData.description,
  );
  TestValidator.equals(
    "scheduled_end should be updated",
    updatedWindow.scheduled_end,
    updateData.scheduled_end,
  );
  TestValidator.equals(
    "notification_message should be updated",
    updatedWindow.notification_message,
    updateData.notification_message,
  );
  TestValidator.equals(
    "impact_level should be updated",
    updatedWindow.impact_level,
    updateData.impact_level,
  );
  TestValidator.equals(
    "affected_services should be updated",
    updatedWindow.affected_services,
    updateData.affected_services,
  );
  // 7. 验证未更新的字段保持不变
  TestValidator.equals(
    "id should remain unchanged",
    updatedWindow.id,
    maintenanceWindow.id,
  );
  TestValidator.equals(
    "maintenance_type should remain unchanged",
    updatedWindow.maintenance_type,
    maintenanceWindow.maintenance_type,
  );
  TestValidator.equals(
    "scheduled_start should remain unchanged",
    updatedWindow.scheduled_start,
    maintenanceWindow.scheduled_start,
  );
  TestValidator.equals(
    "status should remain scheduled",
    updatedWindow.status,
    "scheduled",
  );
  // 8. 验证业务逻辑：scheduled_end必须在scheduled_start之后
  const scheduledStart = new Date(updatedWindow.scheduled_start);
  const scheduledEnd = new Date(updatedWindow.scheduled_end);
  TestValidator.predicate(
    "scheduled_end should be after scheduled_start",
    scheduledEnd > scheduledStart,
  );
  // 9. 验证时间戳已更新
  const originalUpdatedAt = new Date(maintenanceWindow.updated_at);
  const newUpdatedAt = new Date(updatedWindow.updated_at);
  TestValidator.predicate(
    "updated_at should be newer",
    newUpdatedAt > originalUpdatedAt,
  );
}
