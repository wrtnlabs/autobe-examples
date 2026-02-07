import { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityAdminServiceOverview(props: {
  admin: AdminPayload;
}): Promise<ICommunityServiceStatus[]> {
  const services = await MyGlobal.prisma.community_service_statuses.findMany({
    where: { deleted_at: null },
    orderBy: { service_name: "asc" },
  });
  return services.map((service) => ({
    id: service.id,
    service_name: service.service_name,
    status: service.status,
    last_checked: toISOStringSafe(service.last_checked),
    description: service.description,
    created_at: toISOStringSafe(service.created_at),
    updated_at: toISOStringSafe(service.updated_at),
  }));
}
