import { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformMaintenanceWindowCollector {
  export async function collect(props: {
    body: ICommunityPlatformMaintenanceWindow.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description,
      maintenance_type: props.body.maintenance_type,
      scheduled_start: new Date(props.body.scheduled_start),
      scheduled_end: new Date(props.body.scheduled_end),
      actual_start: null,
      actual_end: null,
      status: "scheduled",
      notification_message: props.body.notification_message,
      notification_sent_at: null,
      impact_level: props.body.impact_level,
      affected_services: props.body.affected_services,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_platform_maintenance_windowsCreateInput;
  }
}
