import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerSalePromotionsPromotionId(props: {
  seller: SellerPayload;
  promotionId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.shopping_mall_sale_promotions.delete({
      where: { id: props.promotionId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new HttpException("Sale promotion not found", 404);
      }
    }
    throw error;
  }
}
