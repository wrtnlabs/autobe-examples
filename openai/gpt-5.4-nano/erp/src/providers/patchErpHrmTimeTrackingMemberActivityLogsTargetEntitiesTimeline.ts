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

export async function patchErpHrmTimeTrackingMemberActivityLogsTargetEntitiesTimeline(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntry.IRequest;
}): Promise<IPageIErpHrmTimeTrackingActivityLogEntry.ISummary> {
  const { member, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const targetEntityType = body.targetEntityType;
  const targetEntityId = body.targetEntityId;
  if (
    targetEntityType === undefined ||
    targetEntityType === null ||
    targetEntityType === ""
  ) {
    throw new HttpException("targetEntityType is required", 400);
  }
  if (
    targetEntityId === undefined ||
    targetEntityId === null ||
    targetEntityId === ("" as unknown as typeof targetEntityId)
  ) {
    throw new HttpException("targetEntityId is required", 400);
  }
  if (body.occurredAtFrom !== undefined && body.occurredAtTo !== undefined) {
    if (body.occurredAtFrom > body.occurredAtTo) {
      throw new HttpException("occurredAtFrom must be <= occurredAtTo", 400);
    }
  }
  const session =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow(
      {
        where: { id: member.session_id },
        select: {
          member: {
            select: {
              id: true,
              projectMemberships: {
                select: {
                  project: {
                    select: {
                      erp_hrm_time_tracking_organization_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  const organizationId =
    session.member.projectMemberships[0]?.project
      .erp_hrm_time_tracking_organization_id;
  if (organizationId === undefined) {
    throw new HttpException("organization not found", 400);
  }
  const where: Prisma.erp_hrm_time_tracking_activity_log_entriesWhereInput = {
    organization_id: organizationId,
    target_entity_type: targetEntityType,
    target_entity_id: targetEntityId,
  };
  if (body.occurredAtFrom !== undefined || body.occurredAtTo !== undefined) {
    (
      where as Prisma.erp_hrm_time_tracking_activity_log_entriesWhereInput
    ).occurred_at = {
      ...(body.occurredAtFrom !== undefined
        ? { gte: body.occurredAtFrom }
        : {}),
      ...(body.occurredAtTo !== undefined ? { lte: body.occurredAtTo } : {}),
    };
  }
  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.count({
      where,
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.findMany({
      where,
      orderBy: { occurred_at: "desc" } as never,
      skip,
      take: limit,
      select: {
        id: true,
        occurred_at: true,
        target_entity_type: true,
        target_entity_id: true,
      },
    }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return {
    page: page as never,
    limit: limit as never,
    total: total as never,
    totalPages: totalPages as never,
    ...(items.length
      ? {
          items: items.map(
            (x) =>
              ({
                id: x.id as never,
                occurred_at: toISOStringSafe(x.occurred_at as never) as never,
                target_entity_type: x.target_entity_type as never,
                target_entity_id: x.target_entity_id as never,
              }) as never,
          ),
        }
      : null),
  } as never;
}
