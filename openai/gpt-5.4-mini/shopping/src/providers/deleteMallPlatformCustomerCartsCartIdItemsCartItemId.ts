import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMallPlatformCustomerCartsCartIdItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_shopping_carts.findUniqueOrThrow({
      where: {
        id: props.cartId,
        mall_platform_customer_id: props.customer.id,
      },
      select: {
        id: true,
      },
    });
    const item = await prisma.mall_platform_cart_items.findFirst({
      where: {
        id: props.cartItemId,
        mall_platform_shopping_cart_id: props.cartId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (item === null) return;
    await prisma.mall_platform_cart_items.delete({
      where: {
        id: item.id,
      },
    });
  });
}
