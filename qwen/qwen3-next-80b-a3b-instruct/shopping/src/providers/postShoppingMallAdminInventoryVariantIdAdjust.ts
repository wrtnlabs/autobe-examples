import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
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

export async function postShoppingMallAdminInventoryVariantIdAdjust(props: {
  admin: AdminPayload;
  variantId: string;
  body: IShoppingMallInventoryLog.IAdjust;
}): Promise<void> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
    });
  if (props.body.reason !== "adjustment" && props.body.reason !== "loss") {
    throw new HttpException(
      'Reason must be either "adjustment" or "loss"',
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const createdAt = toISOStringSafe(new Date());
    const updatedAt = toISOStringSafe(new Date());
    await prisma.shopping_mall_inventory_logs.create({
      data: {
        id: v4(),
        variant_id: props.variantId,
        change_quantity: props.body.quantity satisfies number as number,
        reason: props.body.reason satisfies "adjustment" | "loss" as
          | "adjustment"
          | "loss",
        created_at: createdAt,
        updated_at: updatedAt,
      },
    });
    await prisma.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        stock_quantity: {
          increment: props.body.quantity satisfies number as number,
        },
      },
    });
  });
}
