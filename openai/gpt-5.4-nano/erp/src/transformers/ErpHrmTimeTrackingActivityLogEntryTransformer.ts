import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingActivityLogEntryTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_activity_log_entriesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        summary: true,
        details: true,
        occurred_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: { id: true },
        },
        performedByMember: {
          select: { id: true },
        },
        snapshots: {
          select: { id: true },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_activity_log_entriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingActivityLogEntry> {
    return {
      id: input.id,
      organization_id: input.organization.id,
      performed_by_member_id: input.performedByMember.id,
      action_type: input.action_type,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      summary: input.summary,
      details: input.details ?? null,
      occurred_at: input.occurred_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
