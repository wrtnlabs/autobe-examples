import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntry";
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

export async function patchErpHrmTimeTrackingMemberActivityLogEntries(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntry.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const occurredAtFrom = props.body.occurredAtFrom;
  const occurredAtTo = props.body.occurredAtTo;
  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid pagination", 400);
  }
  if (
    occurredAtFrom !== undefined &&
    occurredAtTo !== undefined &&
    occurredAtFrom > occurredAtTo
  ) {
    throw new HttpException("occurredAtFrom must be <= occurredAtTo", 400);
  }
  const sortOrder = props.body.sortOrder ?? "desc";
  const sortBy = props.body.sortBy;
  const where = {
    deleted_at: null as unknown as null,
    ...(props.body.actionType !== undefined && {
      action_type: props.body.actionType,
    }),
    ...(props.body.targetEntityType !== undefined && {
      target_entity_type: props.body.targetEntityType,
    }),
    ...(props.body.targetEntityId !== undefined && {
      target_entity_id: props.body.targetEntityId,
    }),
    ...(props.body.performedByMemberId !== undefined && {
      performed_by_member_id: props.body.performedByMemberId,
    }),
    ...(occurredAtFrom !== undefined || occurredAtTo !== undefined
      ? {
          occurred_at: {
            ...(occurredAtFrom !== undefined
              ? { gte: new Date(occurredAtFrom) }
              : undefined),
            ...(occurredAtTo !== undefined
              ? { lte: new Date(occurredAtTo) }
              : undefined),
          },
        }
      : undefined),
    ...(props.body.summarySearch !== undefined
      ? {
          summary: {
            contains: props.body.summarySearch,
            mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
          },
        }
      : undefined),
    ...(props.body.detailsSearch !== undefined
      ? {
          details: {
            contains: props.body.detailsSearch,
            mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
          },
        }
      : undefined),
  } satisfies Prisma.erp_hrm_time_tracking_activity_log_entriesWhereInput;
  const skip = (page - 1) * limit;
  const orderBy =
    sortBy === "created_at" || sortBy === "updated_at"
      ? sortBy
        ? ({
            [sortBy]: sortOrder,
          } satisfies Prisma.erp_hrm_time_tracking_activity_log_entriesOrderByWithRelationInput)
        : ({
            occurred_at: sortOrder,
          } satisfies Prisma.erp_hrm_time_tracking_activity_log_entriesOrderByWithRelationInput)
      : ({
          occurred_at: sortOrder,
        } satisfies Prisma.erp_hrm_time_tracking_activity_log_entriesOrderByWithRelationInput);
  const total =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.count({
      where,
    });
  const data =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.findMany({
      where,
      skip,
      take: limit,
      orderBy: [orderBy, { id: sortOrder }],
      select: {
        id: true,
        organization_id: true,
        performed_by_member_id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        summary: true,
        details: true,
        occurred_at: true,
      },
    });
  return {
    data: data.map((entry) => ({
      id: entry.id,
      organization_id: entry.organization_id,
      performed_by_member_id: entry.performed_by_member_id,
      action_type: entry.action_type,
      target_entity_type: entry.target_entity_type,
      target_entity_id: entry.target_entity_id,
      summary: entry.summary,
      details: entry.details ?? null,
      occurred_at: toISOStringSafe(entry.occurred_at),
    })),
    pagination: {
      current: page as unknown as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as unknown as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as unknown as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) as unknown as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
