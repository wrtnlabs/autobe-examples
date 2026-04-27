import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdministratorAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallAdministratorAuditLogAtSummaryTransformer } from "../transformers/ECommerceMallAdministratorAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSuperAdministratorAdministratorsAdministratorIdAuditLogs(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IECommerceMallAdministratorAuditLog.IRequest;
}): Promise<IPageIECommerceMallAdministratorAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_administrator_audit_logsWhereInput = {
    e_commerce_mall_administrator_id: props.administratorId,
    deleted_at: null,
  };
  if (props.body.action_type !== undefined) {
    where.action_type = props.body.action_type;
  }
  if (props.body.target_type !== undefined) {
    where.target_type = props.body.target_type;
  }
  if (props.body.search !== undefined) {
    where.OR = [
      { action_type: { contains: props.body.search } },
      { target_type: { contains: props.body.search } },
    ] satisfies Prisma.e_commerce_mall_administrator_audit_logsWhereInput["OR"];
  }
  if (props.body.created_at !== undefined) {
    where.created_at = {};
    if (props.body.created_at.from !== undefined) {
      where.created_at.gte = props.body.created_at.from;
    }
    if (props.body.created_at.to !== undefined) {
      where.created_at.lte = props.body.created_at.to;
    }
  }
  const orderBy: Prisma.e_commerce_mall_administrator_audit_logsOrderByWithRelationInput =
    props.body.sort === "action_type"
      ? { action_type: "asc" }
      : props.body.sort === "target_type"
        ? { target_type: "asc" }
        : ({
            created_at: "desc",
          } satisfies Prisma.e_commerce_mall_administrator_audit_logsOrderByWithRelationInput);
  const [data, total] = await Promise.all([
    MyGlobal.prisma.e_commerce_mall_administrator_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...ECommerceMallAdministratorAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.e_commerce_mall_administrator_audit_logs.count({
      where,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ECommerceMallAdministratorAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIECommerceMallAdministratorAuditLog.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
// import { IPageIECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdministratorAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSuperAdministratorAdministratorsAdministratorIdAuditLogs(props: {
//   superAdministrator: SuperadministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
//   body: IECommerceMallAdministratorAuditLog.IRequest;
// }): Promise<IPageIECommerceMallAdministratorAuditLog.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_administrator_audit_logs.findMany({
//     ...ECommerceMallAdministratorAuditLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallAdministratorAuditLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------