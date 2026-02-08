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

export async function postShoppingMallAdministratorAdministratorRequestsRequestIdReject(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!record) {
    throw new HttpException("Request not found", 404);
  }
  if (record.status !== "pending") {
    throw new HttpException("Request already resolved", 400);
  }
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_administrator_requests.update({
      where: { id: props.requestId },
      data: { status: "rejected", updated_at: now },
    });
  return updated;
}
