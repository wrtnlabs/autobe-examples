import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdministratorAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EconomicBoardAdministratorAuditLogAtSummaryTransformer } from "../transformers/EconomicBoardAdministratorAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardSuperAdministratorAdminAdminRequests(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEconomicBoardAdministratorAuditLog.IRequest;
}): Promise<IPageIEconomicBoardAdministratorAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  let action_types: IEconomicBoardAdministratorAuditLog.ISummary["action_type"][] =
    [];
  if (props.body.status === "pending") {
    action_types = ["approve_admin_request", "reject_admin_request"];
  } else if (props.body.status === "approved") {
    action_types = ["approve_admin_request"];
  } else if (props.body.status === "rejected") {
    action_types = ["reject_admin_request"];
  }
  const where: Prisma.economic_board_administrator_audit_logsWhereInput = {
    action_type: { in: action_types },
    ...(props.body.actor_id && { actor_id: props.body.actor_id }),
    ...(props.body.target_id !== undefined && {
      target_id: props.body.target_id,
    }), // target_id can be null, so use !== undefined
    ...(props.body.start_date && {
      created_at: { gte: props.body.start_date },
    }),
    ...(props.body.end_date && { created_at: { lte: props.body.end_date } }),
  } satisfies Prisma.economic_board_administrator_audit_logsWhereInput;
  const data =
    await MyGlobal.prisma.economic_board_administrator_audit_logs.findMany({
      where,
      take: limit,
      skip,
      orderBy: { created_at: "desc" },
      ...EconomicBoardAdministratorAuditLogAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.economic_board_administrator_audit_logs.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicBoardAdministratorAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
