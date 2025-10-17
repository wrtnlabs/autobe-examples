import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellerPayoutsPayoutId(props: {
  admin: AdminPayload;
  payoutId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerPayout> {
  const { payoutId } = props;

  const payout =
    await MyGlobal.prisma.shopping_mall_seller_payouts.findUniqueOrThrow({
      where: { id: payoutId },
      select: {
        id: true,
        net_payout_amount: true,
      },
    });

  return {
    id: payout.id as string & tags.Format<"uuid">,
    net_payout_amount: payout.net_payout_amount,
  };
}
