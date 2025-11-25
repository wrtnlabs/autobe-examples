import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminBuyersBuyerId(props: {
  admin: AdminPayload;
  buyerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: {
      id: props.buyerId,
    },
  });

  if (!buyer) {
    throw new HttpException("Buyer not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_buyers.delete({
    where: {
      id: props.buyerId,
    },
  });
}
