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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemAuditLogParameterAtSummaryTransformer } from "../transformers/DiscussionBoardSystemAuditLogParameterAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemAuditLogsAuditLogIdParameters(props: {
  superAdmin: SuperadminPayload;
  auditLogId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemAuditLogParameter.IRequest;
}): Promise<IPageIDiscussionBoardSystemAuditLogParameter.ISummary> {
  // Verify parent audit log exists
  await MyGlobal.prisma.discussion_board_system_audit_logs.findUniqueOrThrow({
    where: { id: props.auditLogId },
  });
  // Prepare pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause using relation property name
  const whereInput = {
    systemAuditLog: { id: props.auditLogId },
    ...(props.body.parameter_key !== undefined && {
      parameter_key: props.body.parameter_key,
    }),
    ...(props.body.parameter_value !== undefined && {
      parameter_value: { contains: props.body.parameter_value },
    }),
  } satisfies Prisma.discussion_board_system_audit_log_parametersWhereInput;
  // OrderBy clause
  const orderByInput = {
    created_at: "asc" as const,
  } satisfies Prisma.discussion_board_system_audit_log_parametersOrderByWithRelationInput;
  // Fetch data with pagination
  const data =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...DiscussionBoardSystemAuditLogParameterAtSummaryTransformer.select(),
      },
    );
  // Fetch total count
  const total =
    await MyGlobal.prisma.discussion_board_system_audit_log_parameters.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemAuditLogParameterAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
