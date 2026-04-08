import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorAuditLogAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdministratorAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_administrator_audit_logsWhereInput =
    {};
  if (props.body.administrator_id !== undefined) {
    whereInput.shopping_mall_administrator_id = props.body.administrator_id;
  }
  if (props.body.action_type !== undefined) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.target_type !== undefined) {
    whereInput.target_type = props.body.target_type;
  }
  if (props.body.target_id !== undefined) {
    whereInput.target_id = props.body.target_id;
  }
  if (props.body.ip_address !== undefined) {
    whereInput.ip_address = {
      contains: props.body.ip_address,
    };
  }
  if (
    props.body.start_date !== undefined ||
    props.body.end_date !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.start_date !== undefined) {
      whereInput.created_at.gte = new Date(props.body.start_date);
    }
    if (props.body.end_date !== undefined) {
      whereInput.created_at.lte = new Date(props.body.end_date);
    }
  }
  const data =
    await MyGlobal.prisma.shopping_mall_administrator_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallAdministratorAuditLogAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_administrator_audit_logs.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdministratorAuditLogAtSummaryTransformer.transform,
    ),
  };
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
// import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
// import { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdministratorAuditLogs(props: {
//   administrator: AdministratorPayload;
//   body: IShoppingMallAdministratorAuditLog.IRequest;
// }): Promise<IPageIShoppingMallAdministratorAuditLog.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_administrator_audit_logs.findMany({
//     ...ShoppingMallAdministratorAuditLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdministratorAuditLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------