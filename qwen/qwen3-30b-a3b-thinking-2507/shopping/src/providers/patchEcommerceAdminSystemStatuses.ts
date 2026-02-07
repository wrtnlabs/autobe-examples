import { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminSystemStatuses(props: {
  admin: AdminPayload;
  body: IEcommerceSystemStatus.IRequest;
}): Promise<IPageIEcommerceSystemStatus.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_system_statuses.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { last_check_timestamp: "desc" },
  });
  const total = await MyGlobal.prisma.ecommerce_system_statuses.count({
    where: { deleted_at: null },
  });
  const transformedData = data.map(
    (record) =>
      ({
        id: record.id,
        component_name: record.component_name,
        status: record.status,
        health_score: record.health_score,
        last_check_timestamp: toISOStringSafe(record.last_check_timestamp),
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
        deleted_at: record.deleted_at
          ? toISOStringSafe(record.deleted_at)
          : null,
      }) as IEcommerceSystemStatus.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
