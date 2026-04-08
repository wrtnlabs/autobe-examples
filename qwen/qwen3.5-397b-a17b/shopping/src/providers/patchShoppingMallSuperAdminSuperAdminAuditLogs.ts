import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminAuditLog";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { IShoppingMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSuperAdminAuditLogAtSummaryTransformer } from "../transformers/ShoppingMallSuperAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminSuperAdminAuditLogs(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSuperAdminAuditLog.IRequest;
}): Promise<IPageIShoppingMallSuperAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_super_admin_audit_logsWhereInput = {
    deleted_at: null,
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.target_model !== undefined && {
      target_model: props.body.target_model,
    }),
    ...(props.body.super_admin_id !== undefined && {
      super_admin_id: props.body.super_admin_id,
    }),
    ...(props.body.target_id !== undefined && {
      target_id: props.body.target_id,
    }),
    ...(props.body.date_from !== undefined && {
      created_at: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to !== undefined && {
      created_at: { lte: new Date(props.body.date_to) },
    }),
    ...(props.body.response_status !== undefined && {
      response_status: props.body.response_status,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { action_type: { contains: props.body.search } },
        { target_model: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.shopping_mall_super_admin_audit_logsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_super_admin_audit_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallSuperAdminAuditLogAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_super_admin_audit_logs.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSuperAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallSuperAdminAuditLog.ISummary;
}
