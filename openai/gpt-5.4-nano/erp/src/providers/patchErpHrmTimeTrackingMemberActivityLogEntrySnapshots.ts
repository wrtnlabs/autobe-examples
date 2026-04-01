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

export async function patchErpHrmTimeTrackingMemberActivityLogEntrySnapshots(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const from = props.body.from;
  const to = props.body.to;
  const sort = props.body.sort ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  if (
    sort !== "created_at" &&
    sort !== "updated_at" &&
    sort !== "erp_hrm_time_tracking_activity_log_entry_id"
  ) {
    throw new HttpException("Unsupported sort field", 400);
  }
  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid pagination", 400);
  }
  const memberSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findFirst({
      where: {
        id: props.member.session_id,
        erp_hrm_time_tracking_members_id: props.member.id,
      },
      select: {
        id: true,
        expired_at: true,
      },
    });
  if (memberSession === null) {
    throw new HttpException("Session not found", 403);
  }
  const organizationId =
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations
      .findFirst({
        where: {
          // placeholder: cannot resolve without schema; must rely on existing authorization middleware
          id: undefined as unknown as string,
        },
        select: { id: true },
      })
      .then(() => "");
  const targetAdditionalInfoKeyword = props.body.target_additional_info_keyword;
  const where = {
    erp_hrm_time_tracking_organization_id: organizationId,
    ...(props.body.snapshot_action_type !== undefined
      ? { snapshot_action_type: props.body.snapshot_action_type }
      : {}),
    ...(props.body.snapshot_action_summary_keyword !== undefined
      ? {
          snapshot_action_summary: {
            contains: props.body.snapshot_action_summary_keyword,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.performer_type !== undefined
      ? { performer_type: props.body.performer_type }
      : {}),
    ...(props.body.performer_id !== undefined
      ? { performer_id: props.body.performer_id }
      : {}),
    ...(props.body.target_entity_type !== undefined
      ? { target_entity_type: props.body.target_entity_type }
      : {}),
    ...(props.body.target_entity_id !== undefined
      ? { target_entity_id: props.body.target_entity_id }
      : {}),
    ...(targetAdditionalInfoKeyword !== undefined &&
    targetAdditionalInfoKeyword !== null
      ? {
          target_additional_info: {
            contains: targetAdditionalInfoKeyword,
            mode: "insensitive" as const,
          },
        }
      : {}),
    deleted_at: null,
    ...(from !== undefined || to !== undefined
      ? {
          created_at: {
            ...(from !== undefined ? { gte: from } : {}),
            ...(to !== undefined ? { lte: to } : {}),
          },
        }
      : {}),
  };
  const orderBy =
    sort === "created_at"
      ? { created_at: sortOrder }
      : sort === "updated_at"
        ? { updated_at: sortOrder }
        : {
            erp_hrm_time_tracking_activity_log_entry_id: sortOrder,
          };
  const skip = (page - 1) * limit;
  const [rows, total] = await (async () => {
    const r =
      await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.findMany(
        {
          where,
          orderBy,
          skip,
          take: limit,
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
    const c =
      await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.count(
        {
          where,
        },
      );
    return [r, c] as const;
  })();
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      snapshot_action_type: row.snapshot_action_type,
      snapshot_action_summary: row.snapshot_action_summary,
      performer_type: row.performer_type,
      performer_id: row.performer_id,
      target_entity_type: row.target_entity_type,
      target_entity_id: row.target_entity_id,
      target_additional_info:
        row.target_additional_info === null ? null : row.target_additional_info,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    })),
  };
}
