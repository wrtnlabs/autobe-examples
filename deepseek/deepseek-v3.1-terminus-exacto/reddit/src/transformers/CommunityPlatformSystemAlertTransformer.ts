import { ICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlert";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformSystemAlertTransformer {
  export type Payload = Prisma.community_platform_system_alertsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        alert_type: true,
        severity: true,
        status: true,
        title: true,
        description: true,
        source_component: true,
        acknowledged_at: true,
        resolved_at: true,
        resolution_notes: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_system_alertsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSystemAlert> {
    return {
      id: input.id,
      alert_type: input.alert_type,
      severity: input.severity,
      status: input.status,
      title: input.title,
      description: input.description,
      source_component: input.source_component,
      acknowledged_at: input.acknowledged_at
        ? input.acknowledged_at.toISOString()
        : null,
      resolved_at: input.resolved_at ? input.resolved_at.toISOString() : null,
      resolution_notes: input.resolution_notes ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
