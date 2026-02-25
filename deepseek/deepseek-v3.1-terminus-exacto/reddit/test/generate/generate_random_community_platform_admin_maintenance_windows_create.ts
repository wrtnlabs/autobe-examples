import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_maintenance_window } from "../prepare/prepare_random_community_platform_maintenance_window";

export async function generate_random_community_platform_admin_maintenance_windows_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformMaintenanceWindow.ICreate>;
  },
): Promise<ICommunityPlatformMaintenanceWindow> {
  const prepared: ICommunityPlatformMaintenanceWindow.ICreate =
    prepare_random_community_platform_maintenance_window(props.body);
  const result: ICommunityPlatformMaintenanceWindow =
    await api.functional.communityPlatform.admin.maintenance_windows.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
