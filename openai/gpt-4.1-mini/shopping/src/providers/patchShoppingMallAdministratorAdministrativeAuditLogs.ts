import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrativeAuditLog";
import { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAdministrativeAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministrativeAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdministrativeAuditLog.ISummary> {
  const { administrator, body } = props;
  // Use default pagination since body.page and body.limit do not exist
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // No createdAtFilter because created_at_from and created_at_to do not exist on IRequest
  const where: Prisma.shopping_mall_administrative_audit_logsWhereInput = {};
  const data =
    await MyGlobal.prisma.shopping_mall_administrative_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_administrative_audit_logs.count({
      where,
    });
  return {
    data: [],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
