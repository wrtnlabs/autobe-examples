import { ICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMaintenanceConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityMaintenanceConfigCollector {
  export async function collect(props: {
    body: ICommunityMaintenanceConfig.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      task_type: "cleanup", // Default as ICreate is empty
      schedule_cron: "0 2 * * *", // Default daily at 2 AM as ICreate is empty
      enabled: true, // Default enabled as ICreate is empty
      last_run_at: null,
      next_run_at: null,
      config_data: null,
      max_retries: 3, // Default retry count as ICreate is empty
      timeout_seconds: 300, // Default timeout as ICreate is empty
      notification_email: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_maintenance_configsCreateInput;
  }
}
