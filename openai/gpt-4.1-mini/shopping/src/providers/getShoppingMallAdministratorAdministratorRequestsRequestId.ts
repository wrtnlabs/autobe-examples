import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
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

export async function getShoppingMallAdministratorAdministratorRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        actor_type: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Administrator request not found", 404);
  }
  return {
    id: record.id,
    actor_type: record.actor_type,
    reason: record.reason,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
