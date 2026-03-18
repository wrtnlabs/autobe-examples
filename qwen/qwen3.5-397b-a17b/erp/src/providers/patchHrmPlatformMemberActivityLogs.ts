import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member not associated with any organization", 403);
  }
  const whereInput = {
    organization_id: employee.organization_id,
    deleted_at: null,
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.member_id && { member_id: props.body.member_id }),
    ...(props.body.target_entity_type && {
      target_entity_type: props.body.target_entity_type,
    }),
    ...(props.body.target_entity_id && {
      target_entity_id: props.body.target_entity_id,
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
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
  };
}
