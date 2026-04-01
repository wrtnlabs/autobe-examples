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
import { HrmsActivityLogAtSummaryTransformer } from "../transformers/HrmsActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberActivityLogs(props: {
  member: MemberPayload;
  body: IHrmsActivityLog.IRequest;
}): Promise<IPageIHrmsActivityLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Get all organization memberships for the member
  const memberOrgMemberships =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: { hrms_organization_id: true },
    });
  if (memberOrgMemberships.length === 0) {
    throw new HttpException("Member has no organization memberships", 404);
  }
  const organizationIds = memberOrgMemberships.map(
    (m) => m.hrms_organization_id,
  );
  const whereInput: Prisma.hrms_activity_logsWhereInput = {
    organization_id: { in: organizationIds },
    deleted_at: null,
  };
  if (props.body.actionType !== undefined) {
    whereInput.action_type = props.body.actionType;
  }
  if (props.body.performedByUserId !== undefined) {
    whereInput.performed_by_id = props.body.performedByUserId;
  }
  if (props.body.targetEntityType !== undefined) {
    whereInput.target_entity = props.body.targetEntityType;
  }
  if (props.body.createdAtFrom !== undefined) {
    whereInput.created_at = { gte: new Date(props.body.createdAtFrom) };
  }
  if (props.body.createdAtTo !== undefined) {
    if (
      whereInput.created_at !== undefined &&
      typeof whereInput.created_at === "object" &&
      "gte" in whereInput.created_at
    ) {
      const existingCreated = whereInput.created_at;
      whereInput.created_at = {
        gte: existingCreated.gte,
        lte: new Date(props.body.createdAtTo),
      };
    } else {
      whereInput.created_at = { lte: new Date(props.body.createdAtTo) };
    }
  }
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput =
    sortBy === "updated_at"
      ? { updated_at: sortOrder as "asc" | "desc" }
      : sortBy === "action_type"
        ? { action_type: sortOrder as "asc" | "desc" }
        : sortBy === "target_entity"
          ? { target_entity: sortOrder as "asc" | "desc" }
          : { created_at: sortOrder as "asc" | "desc" };
  const data = await MyGlobal.prisma.hrms_activity_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmsActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrms_activity_logs.count({
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
      HrmsActivityLogAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmsActivityLog.ISummary;
}
