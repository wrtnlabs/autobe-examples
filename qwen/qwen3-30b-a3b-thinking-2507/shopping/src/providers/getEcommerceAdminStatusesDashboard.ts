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

export async function getEcommerceAdminStatusesDashboard(props: {
  admin: AdminPayload;
}): Promise<IPageIEcommerceSystemStatus.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const statuses = await MyGlobal.prisma.ecommerce_system_statuses.findMany({
    where: {
      deleted_at: null,
    },
    skip,
    take: limit,
  });
  const totalCount = await MyGlobal.prisma.ecommerce_system_statuses.count({
    where: {
      deleted_at: null,
    },
  });
  const transformedStatuses = statuses.map((record) => ({}));
  return {
    data: transformedStatuses,
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
