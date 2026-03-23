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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformActivityLogAtSummaryTransformer } from "../transformers/HrmPlatformActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminActivityLogs(props: {
  admin: AdminPayload;
  body: IHrmPlatformActivityLog.IRequest;
}): Promise<IPageIHrmPlatformActivityLog.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.page_size ?? 20;
  const skip = (page - 1) * pageSize;
  const whereInput = {
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.member_id !== undefined && {
      hrm_platform_member_id: props.body.member_id,
    }),
    ...(props.body.target_entity_type !== undefined && {
      target_entity_type: props.body.target_entity_type,
    }),
    ...(props.body.from_date !== undefined && {
      created_at: {
        gte: new Date(props.body.from_date),
      },
    }),
    ...(props.body.to_date !== undefined && {
      created_at: {
        lte: new Date(props.body.to_date),
      },
    }),
    ...(props.body.search !== undefined && {
      action_description: {
        contains: props.body.search,
      },
    }),
  } satisfies Prisma.hrm_platform_activity_logsWhereInput;
  const orderByInput = (
    props.body.sort_by !== undefined &&
    (props.body.sort_by === "created_at" ||
      props.body.sort_by === "action_type" ||
      props.body.sort_by === "target_entity_type")
      ? {
          [props.body.sort_by]:
            props.body.sort_order === "asc" ? "asc" : "desc",
        }
      : { created_at: "desc" }
  ) satisfies Prisma.hrm_platform_activity_logsOrderByWithRelationInput;
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
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformActivityLogAtSummaryTransformer.transform,
    ),
  };
}
