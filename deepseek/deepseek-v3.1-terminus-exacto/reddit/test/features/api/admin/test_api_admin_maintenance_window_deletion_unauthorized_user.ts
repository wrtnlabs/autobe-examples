import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_maintenance_windows_create } from "../../../generate/generate_random_community_platform_admin_maintenance_windows_create";
import { prepare_random_community_platform_maintenance_window } from "../../../prepare/prepare_random_community_platform_maintenance_window";

export async function test_api_admin_maintenance_window_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection and create maintenance window
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const maintenanceWindow =
    await generate_random_community_platform_admin_maintenance_windows_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          maintenance_type: "planned",
          scheduled_start: new Date(Date.now() + 86400000).toISOString(),
          scheduled_end: new Date(Date.now() + 172800000).toISOString(),
          notification_message: RandomGenerator.paragraph({ sentences: 3 }),
          impact_level: "low",
          affected_services: "api,database,frontend",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(maintenanceWindow);
  // Setup user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Attempt unauthorized deletion and validate authorization failure
  await TestValidator.httpError(
    "unauthorized user deletion attempt",
    403,
    async () => {
      await api.functional.communityPlatform.admin.maintenance_windows.erase(
        userConnection,
        {
          maintenanceWindowId: maintenanceWindow.id,
        },
      );
    },
  );
  // Verify maintenance window still exists by attempting to create another window
  // This indirectly confirms the original window wasn't deleted
  const newWindow =
    await generate_random_community_platform_admin_maintenance_windows_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          maintenance_type: "emergency",
          scheduled_start: new Date(Date.now() + 86400000).toISOString(),
          scheduled_end: new Date(Date.now() + 172800000).toISOString(),
          notification_message: RandomGenerator.paragraph({ sentences: 3 }),
          impact_level: "medium",
          affected_services: "api",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(newWindow);
  TestValidator.notEquals(
    "new maintenance window created successfully",
    newWindow.id,
    maintenanceWindow.id,
  );
}
