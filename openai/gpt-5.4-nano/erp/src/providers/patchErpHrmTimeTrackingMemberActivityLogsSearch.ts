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

export async function patchErpHrmTimeTrackingMemberActivityLogsSearch(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntry.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid pagination", 400);
  }
  const sortBy = props.body.sortBy ?? "occurred_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  if (
    sortBy !== "occurred_at" &&
    sortBy !== "created_at" &&
    sortBy !== "action_type"
  ) {
    throw new HttpException("Invalid sortBy", 400);
  }
  const orderBy =
    sortBy === "occurred_at"
      ? { occurred_at: sortOrder }
      : sortBy === "created_at"
        ? { created_at: sortOrder }
        : { action_type: sortOrder };
  // Derive organization scope
  const memberSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findUnique({
      where: { id: props.member.session_id },
      select: {
        member: {
          select: {
            contracts: {
              select: { erp_hrm_time_tracking_organization_id: true },
            },
          },
        },
      },
    });
  const organizationId =
    memberSession?.member?.contracts?.[0]
      ?.erp_hrm_time_tracking_organization_id;
  if (!organizationId) {
    throw new HttpException("Organization context missing", 400);
  }
  if (
    (
      props.member as unknown as {
        permissions?: {
          "org:manage"?: boolean;
        };
      }
    ).permissions?.["org:manage"] !== true
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const where = {
    organization_id: organizationId,
    ...(props.body.includeRemovedEntries
      ? {}
      : { deleted_at: null as unknown as Date }),
    ...(props.body.actionType !== undefined
      ? { action_type: props.body.actionType }
      : {}),
    ...(props.body.performedByMemberId !== undefined
      ? { performed_by_member_id: props.body.performedByMemberId }
      : {}),
    ...(props.body.occurredAtFrom !== undefined ||
    props.body.occurredAtTo !== undefined
      ? {
          occurred_at: {
            ...(props.body.occurredAtFrom !== undefined
              ? { gte: new Date(props.body.occurredAtFrom) }
              : {}),
            ...(props.body.occurredAtTo !== undefined
              ? { lte: new Date(props.body.occurredAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.summarySearch !== undefined
      ? {
          summary: {
            contains: props.body.summarySearch,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.detailsSearch !== undefined
      ? {
          details: {
            contains: props.body.detailsSearch,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.targetEntityType !== undefined
      ? { target_entity_type: props.body.targetEntityType }
      : {}),
    ...(props.body.targetEntityId !== undefined
      ? { target_entity_id: props.body.targetEntityId }
      : {}),
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.findMany({
      where:
        where as Prisma.erp_hrm_time_tracking_activity_log_entriesWhereInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy:
        orderBy as Prisma.erp_hrm_time_tracking_activity_log_entriesOrderByWithRelationInput,
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
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.count({
      where:
        where as Prisma.erp_hrm_time_tracking_activity_log_entriesWhereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: rows.map(
      (r) =>
        ({
          id: r.id as string & tags.Format<"uuid">,
          organization_id: r.organization_id as string & tags.Format<"uuid">,
          performed_by_member_id: r.performed_by_member_id as string &
            tags.Format<"uuid">,
          action_type: r.action_type,
          target_entity_type: r.target_entity_type,
          target_entity_id: r.target_entity_id as string & tags.Format<"uuid">,
          summary: r.summary,
          details: r.details,
          occurred_at: r.occurred_at.toISOString() as string &
            tags.Format<"date-time">,
        }) satisfies IErpHrmTimeTrackingActivityLogEntry.ISummary,
    ),
  };
}
