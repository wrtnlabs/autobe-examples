import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeActivityLogEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeActivityLogEntryAtSummaryTransformer } from "../transformers/ErpHrmTimeActivityLogEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberActivityLogEntries(props: {
  member: MemberPayload;
  body: IErpHrmTimeActivityLogEntry.IRequest;
}): Promise<IPageIErpHrmTimeActivityLogEntry.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const isAscending: boolean = props.body.sort === "asc";
  const where: Prisma.erp_hrm_time_activity_log_entriesWhereInput = {
    ...(props.body.actionType !== undefined
      ? { action_type: props.body.actionType }
      : {}),
    ...(props.body.memberId !== undefined
      ? { member_id: props.body.memberId }
      : {}),
    ...(props.body.from !== undefined || props.body.to !== undefined
      ? {
          created_at: {
            ...(props.body.from !== undefined ? { gte: props.body.from } : {}),
            ...(props.body.to !== undefined ? { lte: props.body.to } : {}),
          },
        }
      : {}),
    deleted_at: null,
  };
  const records =
    await MyGlobal.prisma.erp_hrm_time_activity_log_entries.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { created_at: isAscending ? "asc" : "desc" },
        { id: isAscending ? "asc" : "desc" },
      ],
      ...ErpHrmTimeActivityLogEntryAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.erp_hrm_time_activity_log_entries.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmTimeActivityLogEntryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
