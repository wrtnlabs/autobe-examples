import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformActivityLogAtSummaryTransformer } from "../transformers/HrmPlatformActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberActivityLogs(props: {
  member: MemberPayload;
  body: IHrmPlatformActivityLog.IRequest;
}): Promise<IPageIHrmPlatformActivityLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (!membership) {
    throw new HttpException("Member has no organization membership", 403);
  }
  const organizationId = membership.hrm_platform_organization_id;
  const dateFilters: {
    created_at?: {
      gte?: Date;
      lte?: Date;
    };
  } = {};
  if (props.body.dateFrom) {
    dateFilters.created_at = {
      ...dateFilters.created_at,
      gte: new Date(`${props.body.dateFrom}T00:00:00Z`),
    };
  }
  if (props.body.dateTo) {
    dateFilters.created_at = {
      ...dateFilters.created_at,
      lte: new Date(`${props.body.dateTo}T23:59:59.999Z`),
    };
  }
  const whereInput: Prisma.hrm_platform_activity_logsWhereInput = {
    hrm_platform_organization_id: organizationId,
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.userId && { hrm_platform_member_id: props.body.userId }),
    ...(dateFilters.created_at && { created_at: dateFilters.created_at }),
    ...(props.body.search && {
      OR: [
        { action_type: { contains: props.body.search, mode: "insensitive" } },
        {
          target_entity_type: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        { details: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.hrm_platform_activity_logsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_activity_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmPlatformActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_activity_logs.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformActivityLogAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformActivityLog.ISummary;
}
