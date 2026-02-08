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

export async function putShoppingMallAdministratorAdministratorRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorRequest.IUpdate;
}): Promise<IShoppingMallAdministratorRequest> {
  const existing =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!existing)
    throw new HttpException("Administrator request not found", 404);
  const updateData: Partial<{
    status: string;
    reason: string;
    updated_at: string & tags.Format<"date-time">;
  }> = {};
  if (
    "status" in props.body &&
    props.body.status !== undefined &&
    props.body.status !== null
  ) {
    updateData.status = typia.assert<string>(props.body.status!);
  }
  if (
    "reason" in props.body &&
    props.body.reason !== undefined &&
    props.body.reason !== null
  ) {
    updateData.reason = typia.assert<string>(props.body.reason!);
  }
  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = toISOStringSafe(new Date());
  }
  await MyGlobal.prisma.shopping_mall_administrator_requests.update({
    where: { id: props.requestId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!updated) {
    throw new HttpException(
      "Administrator request not found after update",
      404,
    );
  }
  return updated;
}
