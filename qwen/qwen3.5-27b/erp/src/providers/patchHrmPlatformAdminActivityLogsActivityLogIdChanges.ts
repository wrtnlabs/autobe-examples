import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLogChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformActivityLogChangeAtSummaryTransformer } from "../transformers/HrmPlatformActivityLogChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminActivityLogsActivityLogIdChanges(props: {
  admin: AdminPayload;
  activityLogId: string & tags.Format<"uuid">;
  body: IHrmPlatformActivityLogChange.IRequest;
}): Promise<IPageIHrmPlatformActivityLogChange.ISummary> {
  const activityLog =
    await MyGlobal.prisma.hrm_platform_activity_logs.findUniqueOrThrow({
      where: { id: props.activityLogId },
      select: { id: true, hrm_platform_organization_id: true },
    });
  const whereInput = {
    hrm_platform_activity_log_id: props.activityLogId,
    ...(props.body.field_name !== undefined && {
      field_name: { contains: props.body.field_name },
    }),
    ...(props.body.field_type !== undefined && {
      field_type: props.body.field_type,
    }),
    ...(props.body.old_value !== undefined && {
      old_value: { contains: props.body.old_value },
    }),
    ...(props.body.new_value !== undefined && {
      new_value: { contains: props.body.new_value },
    }),
  } satisfies Prisma.hrm_platform_activity_log_changesWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.hrm_platform_activity_log_changes.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformActivityLogChangeAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.hrm_platform_activity_log_changes.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformActivityLogChangeAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
