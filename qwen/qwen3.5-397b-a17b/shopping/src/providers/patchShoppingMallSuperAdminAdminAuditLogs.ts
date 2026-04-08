import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminAuditLogAtSummaryTransformer } from "../transformers/ShoppingMallAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminAdminAuditLogs(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallAdminAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_admin_audit_logsWhereInput = {
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.target_entity_type !== undefined && {
      target_entity_type: props.body.target_entity_type,
    }),
    ...(props.body.shopping_mall_admin_id !== undefined && {
      shopping_mall_admin_id: props.body.shopping_mall_admin_id,
    }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_to !== undefined && {
        created_at: {
          gte: new Date(props.body.created_at_from),
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_to === undefined && {
        created_at: {
          gte: new Date(props.body.created_at_from),
        },
      }),
    ...(props.body.created_at_from === undefined &&
      props.body.created_at_to !== undefined && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
  } satisfies Prisma.shopping_mall_admin_audit_logsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_admin_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallAdminAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_admin_audit_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallAdminAuditLog.ISummary;
}
