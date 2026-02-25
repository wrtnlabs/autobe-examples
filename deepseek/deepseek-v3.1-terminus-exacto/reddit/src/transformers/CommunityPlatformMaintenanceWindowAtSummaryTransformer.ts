import { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformMaintenanceWindowAtSummaryTransformer {
  export type Payload = Prisma.community_platform_maintenance_windowsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        maintenance_type: true,
        scheduled_start: true,
        scheduled_end: true,
        actual_start: true,
        actual_end: true,
        status: true,
        notification_message: true,
        notification_sent_at: true,
        impact_level: true,
        affected_services: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_maintenance_windowsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMaintenanceWindow.ISummary> {
    return {
      id: input.id,
      title: input.title,
      maintenance_type: input.maintenance_type,
      scheduled_start: input.scheduled_start.toISOString(),
      scheduled_end: input.scheduled_end.toISOString(),
      actual_start: input.actual_start?.toISOString() ?? null,
      actual_end: input.actual_end?.toISOString() ?? null,
      status: input.status,
      impact_level: input.impact_level,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
