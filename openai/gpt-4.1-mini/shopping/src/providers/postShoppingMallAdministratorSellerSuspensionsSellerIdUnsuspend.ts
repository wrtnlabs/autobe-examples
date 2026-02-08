import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function postShoppingMallAdministratorSellerSuspensionsSellerIdUnsuspend(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const nowISO: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const activeSuspensions =
      await tx.shopping_mall_seller_suspensions.findMany({
        where: { seller_id: props.sellerId, deleted_at: null },
      });
    if (activeSuspensions.length === 0) {
      throw new HttpException("Active suspension not found.", 404);
    }
    await tx.shopping_mall_seller_suspensions.updateMany({
      where: { seller_id: props.sellerId, deleted_at: null },
      data: { deleted_at: nowISO },
    });
    const seller = await tx.shopping_mall_sellers.findUnique({
      where: { id: props.sellerId },
    });
    if (seller === null) {
      throw new HttpException("Seller not found.", 404);
    }
    return seller;
  });
}
