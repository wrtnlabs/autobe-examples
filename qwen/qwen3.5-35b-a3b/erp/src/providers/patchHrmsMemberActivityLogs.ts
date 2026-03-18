import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsActivityLog";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsActivityLog";
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

export async function patchHrmsMemberActivityLogs(props: {
  member: MemberPayload;
  body: IHrmsActivityLog.IRequest;
}): Promise<IPageIHrmsActivityLog.ISummary> {
  // Extract pagination parameters with validation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const validatedPage = Math.max(page, 1);
  const skip = (validatedPage - 1) * validatedLimit;
  // Get member's organizations to filter activity logs
  const memberOrgs = await MyGlobal.prisma.hrms_organization_members.findMany({
    where: {
      hrms_member_id: props.member.id,
      deleted_at: null,
    },
    select: { hrms_organization_id: true },
  });
  const orgIds = memberOrgs.map((om) => om.hrms_organization_id);
  // Build WHERE clause for activity log filtering
  const whereClause: Prisma.hrms_activity_logsWhereInput = {
    organization_id: { in: orgIds },
    deleted_at: null,
    ...(props.body.actionType !== undefined && {
      action_type: props.body.actionType,
    }),
    ...(props.body.performedByUserId !== undefined && {
      performed_by_id: props.body.performedByUserId,
    }),
    ...(props.body.targetEntityType !== undefined && {
      target_entity: props.body.targetEntityType,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
  };
  // Build ORDER BY clause with validation
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "action_type",
    "target_entity",
  ] as const;
  const sortBy = allowedSortFields.includes(props.body.sortBy as any)
    ? (props.body.sortBy ?? "created_at")
    : "created_at";
  const sortOrder =
    props.body.sortOrder === "asc" || props.body.sortOrder === "desc"
      ? props.body.sortOrder
      : "desc";
  const orderByClause = {
    [sortBy]: sortOrder,
  } satisfies Prisma.hrms_activity_logsOrderByWithRelationInput;
  // Apply cursor pagination if cursor provided
  if (props.body.cursor !== undefined) {
    whereClause.created_at = { lt: new Date(props.body.cursor) };
  }
  // Query activity logs with performedBy member relation
  const data = await MyGlobal.prisma.hrms_activity_logs.findMany({
    where: whereClause,
    skip,
    take: validatedLimit,
    orderBy: orderByClause,
    select: {
      id: true,
      action_type: true,
      target_entity: true,
      target_id: true,
      performed_by_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      performedBy: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_uri: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      } satisfies Prisma.hrms_membersFindManyArgs,
    },
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.hrms_activity_logs.count({
    where: whereClause,
  });
  // Query organization membership count for all performedBy users (optimize with batch)
  const performedByIds = Array.from(
    new Set(data.map((log) => log.performed_by_id)),
  );
  const memberCounts = await MyGlobal.prisma.hrms_organization_members.groupBy({
    by: ["hrms_member_id"],
    _count: true,
    where: {
      hrms_member_id: { in: performedByIds },
      deleted_at: null,
    },
  });
  const membershipCountMap = new Map(
    memberCounts.map((m) => [
      m.hrms_member_id,
      (m._count as any).hrms_member_id ?? 0,
    ]),
  );
  // Transform database results to DTO format
  const transformedData = data.map((log) => {
    const memberSummary: IHrmsMember.ISummary = {
      id: log.performedBy.id as string & tags.Format<"uuid">,
      email: log.performedBy.email,
      display_name: log.performedBy.display_name,
      avatar_uri: log.performedBy.avatar_uri,
      phone_number: log.performedBy.phone_number,
      organization_membership_count: membershipCountMap.get(
        log.performedBy.id,
      ) as number & tags.Type<"int32">,
      created_at: log.performedBy.created_at.toISOString(),
      updated_at: log.performedBy.updated_at.toISOString(),
      deleted_at: log.performedBy.deleted_at?.toISOString() ?? null,
    };
    return {
      id: log.id as string & tags.Format<"uuid">,
      actionType: log.action_type,
      targetEntity: log.target_entity,
      targetId: log.target_id as
        | (string & tags.Format<"uuid">)
        | null
        | undefined,
      performedBy: memberSummary,
      createdAt: log.created_at.toISOString(),
      updatedAt: log.updated_at.toISOString(),
      deletedAt: log.deleted_at?.toISOString() ?? null,
    } as IHrmsActivityLog.ISummary;
  });
  // Build pagination metadata
  const totalPages = total === 0 ? 0 : Math.ceil(total / validatedLimit);
  const effectivePage =
    totalPages === 0 ? 1 : Math.min(validatedPage, totalPages);
  return {
    pagination: {
      current: effectivePage,
      limit: validatedLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmsActivityLog.ISummary;
}
