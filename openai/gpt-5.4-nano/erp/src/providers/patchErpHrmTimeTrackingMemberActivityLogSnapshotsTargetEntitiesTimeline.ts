import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntrySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberActivityLogSnapshotsTargetEntitiesTimeline(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const targetEntityType = props.body.target_entity_type;
  const targetEntityId = props.body.target_entity_id;
  if (targetEntityType === undefined || targetEntityType.length === 0) {
    throw new HttpException("target_entity_type is required", 400);
  }
  if (targetEntityId === undefined) {
    throw new HttpException("target_entity_id is required", 400);
  }
  const from = props.body.from;
  const to = props.body.to;
  if (from !== undefined && to !== undefined && from > to) {
    throw new HttpException("from must be <= to", 400);
  }
  const resolvedOrg =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.findFirst(
      {
        where: {
          performer_type: "member",
          performer_id: props.member.id,
        },
        select: { erp_hrm_time_tracking_organization_id: true },
        orderBy: { created_at: "desc" },
      },
    );
  if (resolvedOrg === null) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const where = {
    erp_hrm_time_tracking_organization_id:
      resolvedOrg.erp_hrm_time_tracking_organization_id,
    target_entity_type: targetEntityType,
    target_entity_id: targetEntityId,
    deleted_at: null,
    ...(from !== undefined || to !== undefined
      ? {
          created_at: {
            ...(from !== undefined ? { gte: from } : {}),
            ...(to !== undefined ? { lte: to } : {}),
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsWhereInput;
  const orderBy =
    props.body.sortOrder === "asc"
      ? ({
          created_at: "asc",
          id: "asc",
        } satisfies Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
          id: "asc",
        } satisfies Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsOrderByWithRelationInput);
  const skip = (page - 1) * limit;
  const [rows, total] = await (async () => {
    const records =
      await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.findMany(
        {
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            snapshot_action_type: true,
            snapshot_action_summary: true,
            performer_type: true,
            performer_id: true,
            target_entity_type: true,
            target_entity_id: true,
            target_additional_info: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      );
    const count =
      await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.count(
        { where },
      );
    return [records, count] as const;
  })();
  return {
    data: rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      snapshot_action_type: r.snapshot_action_type,
      snapshot_action_summary: r.snapshot_action_summary,
      performer_type: r.performer_type,
      performer_id: r.performer_id as string & tags.Format<"uuid">,
      target_entity_type: r.target_entity_type,
      target_entity_id: r.target_entity_id as string & tags.Format<"uuid">,
      target_additional_info: r.target_additional_info ?? null,
      created_at: toISOStringSafe(r.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(r.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        r.deleted_at === null
          ? null
          : (toISOStringSafe(r.deleted_at) as string &
              tags.Format<"date-time">),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
