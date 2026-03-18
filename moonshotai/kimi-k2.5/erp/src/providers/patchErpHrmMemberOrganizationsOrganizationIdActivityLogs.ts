import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmActivityLogAtSummaryTransformer } from "../transformers/ErpHrmActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizationsOrganizationIdActivityLogs(props: {
  member: MemberPayload;
  organizationId: string;
  body: IErpHrmActivityLog.IRequest;
}): Promise<IPageIErpHrmActivityLog.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;
  // Build dynamic WHERE clause
  const where: Prisma.erp_hrm_activity_logsWhereInput = {
    organization_id: props.organizationId,
    ...(props.body.action !== null &&
      props.body.action !== undefined && {
        action: Array.isArray(props.body.action)
          ? { in: props.body.action }
          : props.body.action,
      }),
    ...(props.body.entityType !== null &&
      props.body.entityType !== undefined && {
        entity_type: Array.isArray(props.body.entityType)
          ? { in: props.body.entityType }
          : props.body.entityType,
      }),
    ...(props.body.entityId !== null &&
      props.body.entityId !== undefined && {
        entity_id: props.body.entityId,
      }),
    ...(props.body.actorMemberId !== null &&
      props.body.actorMemberId !== undefined && {
        actor_member_id: props.body.actorMemberId,
      }),
    ...(props.body.actorGuestId !== null &&
      props.body.actorGuestId !== undefined && {
        actor_guest_id: props.body.actorGuestId,
      }),
    ...(props.body.ipAddress !== null &&
      props.body.ipAddress !== undefined &&
      props.body.ipAddress !== "" && {
        ip_address: {
          contains: props.body.ipAddress,
          mode: "insensitive",
        },
      }),
    ...(props.body.createdAtFrom !== null &&
      props.body.createdAtFrom !== undefined && {
        created_at: { gte: props.body.createdAtFrom },
      }),
    ...(props.body.createdAtTo !== null &&
      props.body.createdAtTo !== undefined && {
        created_at: {
          ...(props.body.createdAtFrom !== null &&
          props.body.createdAtFrom !== undefined
            ? { gte: props.body.createdAtFrom }
            : {}),
          lte: props.body.createdAtTo,
        },
      }),
    ...(props.body.search !== null &&
      props.body.search !== undefined &&
      props.body.search.trim() !== "" && {
        OR: [
          {
            action: {
              contains: props.body.search.trim(),
              mode: "insensitive",
            },
          },
          {
            entity_type: {
              contains: props.body.search.trim(),
              mode: "insensitive",
            },
          },
        ],
      }),
  };
  // Parse sort parameter
  let orderBy: Prisma.erp_hrm_activity_logsOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sort !== null && props.body.sort !== undefined) {
    const trimmedSort = props.body.sort.trim();
    if (trimmedSort !== "") {
      const parts = trimmedSort.split(/\s+/);
      const field = parts[0];
      const direction = parts[1]?.toLowerCase();
      if (
        field === "created_at" ||
        field === "action" ||
        field === "entity_type"
      ) {
        orderBy = { [field]: direction === "asc" ? "asc" : "desc" };
      }
    }
  }
  // Execute queries sequentially
  const data = await MyGlobal.prisma.erp_hrm_activity_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_activity_logs.count({ where });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    ErpHrmActivityLogAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
