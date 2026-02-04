import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";

export async function postShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: {
      ...ShoppingMallSellerTransformer.select().select,
      is_approved: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  if (!seller.is_suspended) {
    throw new HttpException("Seller is not suspended", 400);
  }
  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_suspended: false,
      is_approved: seller.is_approved === false ? true : seller.is_approved,
      updated_at: toISOStringSafe(new Date()),
    },
    select: ShoppingMallSellerTransformer.select().select,
  });
  return await ShoppingMallSellerTransformer.transform(updated);
}
