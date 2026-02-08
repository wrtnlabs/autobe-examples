import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallAdministratorAdministratorRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!existing) {
    throw new HttpException("Administrator request not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_administrator_requests.delete({
    where: { id: props.requestId },
  });
}
