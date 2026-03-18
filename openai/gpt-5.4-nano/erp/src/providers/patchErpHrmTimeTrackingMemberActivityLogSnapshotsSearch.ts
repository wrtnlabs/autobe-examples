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

export async function patchErpHrmTimeTrackingMemberActivityLogSnapshotsSearch(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary> {
  const page = props.body.page ?? (1 as number);
  const limit = props.body.limit ?? (100 as number);
  const skip = (page - 1) * limit;
  // NOTE: Authorization/selected organization resolution placeholders
  const organizationId = (props.member as any).organization_id as string;
  const where = {
    erp_hrm_time_tracking_organization_id: organizationId,
    ...(props.body.snapshot_action_type !== undefined && {
      snapshot_action_type: props.body.snapshot_action_type,
    }),
    ...(props.body.performer_type !== undefined && {
      performer_type: props.body.performer_type,
    }),
    ...(props.body.performer_id !== undefined && {
      performer_id: props.body.performer_id,
    }),
    ...(props.body.target_entity_type !== undefined && {
      target_entity_type: props.body.target_entity_type,
    }),
    ...(props.body.target_entity_id !== undefined && {
      target_entity_id: props.body.target_entity_id,
    }),
    ...(props.body.target_additional_info_keyword !== undefined &&
      props.body.target_additional_info_keyword !== null && {
        target_additional_info: {
          contains: props.body.target_additional_info_keyword,
          mode: "insensitive",
        },
      }),
    ...(props.body.snapshot_action_summary_keyword !== undefined && {
      snapshot_action_summary: {
        contains: props.body.snapshot_action_summary_keyword,
        mode: "insensitive",
      },
    }),
    ...(props.body.from !== undefined && {
      created_at: {
        ...(props.body.to !== undefined
          ? { lte: new Date(props.body.to) }
          : {}),
        ...(props.body.from !== undefined
          ? { gte: new Date(props.body.from) }
          : {}),
      },
    }),
  } satisfies Prisma.erp_hrm_time_tracking_activity_log_entry_snapshotsWhereInput;
  const sortOrder = props.body.sortOrder ?? "desc";
  const sortField = props.body.sort ?? "created_at";
  const orderBy =
    sortField === "created_at"
      ? ({ created_at: sortOrder } as const)
      : ({ created_at: sortOrder } as const);
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.count({
      where,
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.findMany(
      { where, skip, take: limit, orderBy },
    ),
  ]);
  return {
    pagination: {
      current: page as any,
      limit: limit as any,
      records: total as any,
      pages: Math.ceil(total / limit) as any,
    },
    data: rows.map((r) => ({
      id: r.id as any,
      snapshot_action_type: r.snapshot_action_type,
      snapshot_action_summary: r.snapshot_action_summary,
      performer_type: r.performer_type,
      performer_id: r.performer_id as any,
      target_entity_type: r.target_entity_type,
      target_entity_id: r.target_entity_id as any,
      target_additional_info: r.target_additional_info ?? null,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
  };
}
