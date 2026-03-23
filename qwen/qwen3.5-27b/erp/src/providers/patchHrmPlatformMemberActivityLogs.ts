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
  const pageSize = props.body.page_size ?? 20;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_platform_organization_id: true },
    });
  const whereInput: Prisma.hrm_platform_activity_logsWhereInput = {
    hrm_platform_organization_id:
      session.hrm_platform_organization_id ?? undefined,
  };
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
  ) {
    whereInput.action_description = {
      contains: props.body.search,
    };
  }
  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.member_id !== undefined && props.body.member_id !== null) {
    whereInput.hrm_platform_member_id = props.body.member_id;
  }
  if (
    props.body.target_entity_type !== undefined &&
    props.body.target_entity_type !== null
  ) {
    whereInput.target_entity_type = props.body.target_entity_type;
  }
  if (props.body.from_date !== undefined && props.body.from_date !== null) {
    whereInput.created_at = {
      gte: new Date(props.body.from_date),
    };
  }
  if (props.body.to_date !== undefined && props.body.to_date !== null) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = {};
    }
    (whereInput.created_at as Prisma.DateTimeFilter).lte = new Date(
      props.body.to_date,
    );
  }
  const orderByInput: Prisma.hrm_platform_activity_logsOrderByWithRelationInput =
    sortBy === "action_type"
      ? { action_type: sortOrder as "asc" | "desc" }
      : sortBy === "target_entity_type"
        ? { target_entity_type: sortOrder as "asc" | "desc" }
        : { created_at: sortOrder as "asc" | "desc" };
  const skip = (page - 1) * pageSize;
  const data = await MyGlobal.prisma.hrm_platform_activity_logs.findMany({
    where: whereInput,
    skip,
    take: pageSize,
    orderBy: orderByInput,
    ...HrmPlatformActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_activity_logs.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformActivityLogAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: transformedData,
  };
}
