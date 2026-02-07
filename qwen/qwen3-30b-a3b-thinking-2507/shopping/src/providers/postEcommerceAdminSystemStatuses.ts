import { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSystemStatusCollector } from "../collectors/EcommerceSystemStatusCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdminSystemStatuses(props: {
  admin: AdminPayload;
  body: IEcommerceSystemStatus.ICreate;
}): Promise<IEcommerceSystemStatus> {
  const created = await MyGlobal.prisma.ecommerce_system_statuses.create({
    data: await EcommerceSystemStatusCollector.collect({
      body: props.body,
    }),
  });
  return {
    id: created.id,
    component_name: created.component_name,
    status: created.status,
    health_score: created.health_score,
    last_check_timestamp: created.last_check_timestamp,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
