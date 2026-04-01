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
import { ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer } from "../transformers/ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberActivityLogSnapshotsSearch(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const organization =
    await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findFirst({
      where: {
        erp_hrm_time_tracking_employee_id: props.member.id,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_tracking_organization_id: true,
      },
      orderBy: {
        work_term_start_date: "desc",
      },
    });
  if (!organization) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    } satisfies IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary;
  }
  const from =
    props.body.from === undefined
      ? undefined
      : toISOStringSafe(props.body.from);
  const to =
    props.body.to === undefined ? undefined : toISOStringSafe(props.body.to);
  const whereInput = {
    erp_hrm_time_tracking_organization_id:
      organization.erp_hrm_time_tracking_organization_id,
    deleted_at: null,
    ...(props.body.snapshot_action_type !== undefined && {
      snapshot_action_type: props.body.snapshot_action_type,
    }),
    ...(props.body.snapshot_action_summary_keyword !== undefined && {
      snapshot_action_summary: {
        contains: props.body.snapshot_action_summary_keyword,
        mode: "insensitive" as const,
      },
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
          mode: "insensitive" as const,
        },
      }),
    ...(from !== undefined || to !== undefined
      ? {
          created_at: {
            ...(from !== undefined ? { gte: from } : {}),
            ...(to !== undefined ? { lte: to } : {}),
          },
        }
      : {}),
  };
  const orderBy = (() => {
    if (props.body.sort === "created_at") {
      if (props.body.sortOrder === "asc") {
        return { created_at: "asc" as const };
      }
      return { created_at: "desc" as const };
    }
    return { created_at: "desc" as const };
  })();
  const [total, rows] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.count({
      where: whereInput,
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entry_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy,
        ...ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer.select(),
      },
    ),
  ]);
  const data = await ArrayUtil.asyncMap(
    rows,
    ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data as unknown as IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary["data"],
  } satisfies IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary;
}
