import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellerPayoutsPayoutId(props: {
  seller: SellerPayload;
  payoutId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerPayout> {
  const { seller, payoutId } = props;

  const payout = await MyGlobal.prisma.shopping_mall_seller_payouts.findFirst({
    where: {
      id: payoutId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      net_payout_amount: true,
    },
  });

  if (!payout) {
    throw new HttpException("Payout not found or access denied", 404);
  }

  return {
    id: payout.id,
    net_payout_amount: payout.net_payout_amount,
  };
}
