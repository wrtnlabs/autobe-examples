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

export async function postShoppingMallAdministratorAdministratorRequestsRequestIdApprove(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequest> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const request =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!request) {
    throw new HttpException("Administrator request not found", 404);
  }
  if (request.status !== "pending") {
    throw new HttpException("Administrator request status is not pending", 400);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    actor_type: updated.actor_type,
    reason: updated.reason,
    status: updated.status,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
  };
}
