import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmActivityLog.IRequest;
}): Promise<IPageIErpHrmActivityLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortField = props.body.orderBy ?? "created_at";
  const sortDir =
    (props.body.sortOrder ?? "desc") === "asc"
      ? ("asc" as const)
      : ("desc" as const);
  const whereInput = {
    erp_hrm_organization_id: props.organizationId,
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.memberId && { erp_hrm_member_id: props.body.memberId }),
    ...(props.body.startDate &&
      props.body.endDate && {
        created_at: {
          gte: new Date(
            props.body.startDate as string & tags.Format<"date-time">,
          ),
          lte: new Date(
            props.body.endDate as string & tags.Format<"date-time">,
          ),
        },
      }),
    ...(props.body.startDate &&
      !props.body.endDate && {
        created_at: {
          gte: new Date(
            props.body.startDate as string & tags.Format<"date-time">,
          ),
        },
      }),
    ...(!props.body.startDate &&
      props.body.endDate && {
        created_at: {
          lte: new Date(
            props.body.endDate as string & tags.Format<"date-time">,
          ),
        },
      }),
  } satisfies Prisma.erp_hrm_activity_logsWhereInput;
  const orderByInput = {
    [sortField]: sortDir,
  } satisfies Prisma.erp_hrm_activity_logsOrderByWithRelationInput;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.erp_hrm_activity_logs.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ErpHrmActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_activity_logs.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmActivityLogAtSummaryTransformer.transform,
    ),
  };
}
