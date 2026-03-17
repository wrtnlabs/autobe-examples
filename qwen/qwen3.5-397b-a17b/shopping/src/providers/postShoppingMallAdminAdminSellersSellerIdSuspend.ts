import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminAdminSellersSellerIdSuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: {
      id: true,
      suspended: true,
    } satisfies Prisma.shopping_mall_sellersSelect,
  });
  if (seller.suspended === true) {
    throw new HttpException("Seller is already suspended", 400);
  }
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      suspended: true,
      updated_at: new Date(),
    },
  });
}
