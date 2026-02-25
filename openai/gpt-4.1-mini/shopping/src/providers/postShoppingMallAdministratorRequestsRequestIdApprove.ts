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
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorRequestsRequestIdApprove(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequest> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const request =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException(
      "Administrator request is not pending approval",
      400,
    );
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        updated_at: now,
      },
    });
  return await ShoppingMallAdministratorRequestTransformer.transform(updated);
}
