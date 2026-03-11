import { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemAuditLogParameter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemAuditLogParameterAtSummaryTransformer } from "../transformers/DiscussionBoardSystemAuditLogParameterAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSystemAuditLogsAuditLogIdParameters(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemAuditLogParameter.IRequest;
}): Promise<IPageIDiscussionBoardSystemAuditLogParameter.ISummary> {
  // 1. Validate parent audit log exists and is not deleted
  await MyGlobal.prisma.discussion_board_system_audit_logs.findUniqueOrThrow({
    where: {
      id: props.auditLogId,
      deleted_at: null,
    },
  });
  // 2. Build WHERE conditions for parameters
  const parameterWhere = {
    system_audit_log_id: props.auditLogId,
    ...(props.body.parameter_key !== undefined && {
      parameter_key: props.body.parameter_key,
    }),
    ...(props.body.parameter_value !== undefined && {
      parameter_value: {
        contains: props.body.parameter_value,
      },
    }),
  } satisfies Prisma.discussion_board_system_audit_log_parametersWhereInput;
  // 3. Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Execute queries in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_audit_log_parameters.findMany({
      where: parameterWhere,
      skip,
      take: limit,
      orderBy: { created_at: "asc" as const }, // Chronological order
      ...DiscussionBoardSystemAuditLogParameterAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_system_audit_log_parameters.count({
      where: parameterWhere,
    }),
  ]);
  // 5. Transform data using transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemAuditLogParameterAtSummaryTransformer.transform,
  );
  // 6. Return paginated response
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
