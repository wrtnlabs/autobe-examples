import { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityServiceStatus";
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

export async function patchCommunityAdminServiceStatuses(props: {
  admin: AdminPayload;
  body: ICommunityServiceStatus.IRequest;
}): Promise<IPageICommunityServiceStatus.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_service_statuses.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { last_checked: "desc" },
    select: {
      id: true,
      service_name: true,
      status: true,
      last_checked: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_service_statuses.count({
    where: { deleted_at: null },
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      service_name: item.service_name,
      status: item.status,
      last_checked: toISOStringSafe(item.last_checked),
      description: item.description,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
