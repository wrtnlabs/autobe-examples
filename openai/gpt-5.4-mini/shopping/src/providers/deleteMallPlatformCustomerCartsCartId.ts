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

export async function deleteMallPlatformCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const cart = await prisma.mall_platform_shopping_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        mall_platform_customer_id: true,
      },
    });
    if (cart.mall_platform_customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    await prisma.mall_platform_shopping_carts.delete({
      where: { id: props.cartId },
    });
  });
}
