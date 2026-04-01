import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShoppingCartTransformer } from "../transformers/MallPlatformShoppingCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerCarts(props: {
  customer: CustomerPayload;
}): Promise<IMallPlatformShoppingCart> {
  const existing = await MyGlobal.prisma.mall_platform_shopping_carts.findFirst(
    {
      where: {
        mall_platform_customer_id: props.customer.id,
      },
      ...MallPlatformShoppingCartTransformer.select(),
    },
  );
  if (existing !== null) {
    return await MallPlatformShoppingCartTransformer.transform(existing);
  }
  await MyGlobal.prisma.mall_platform_shopping_carts.create({
    data: {
      id: v4(),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
    },
  });
  const created =
    await MyGlobal.prisma.mall_platform_shopping_carts.findUniqueOrThrow({
      where: {
        mall_platform_customer_id: props.customer.id,
      },
      ...MallPlatformShoppingCartTransformer.select(),
    });
  return await MallPlatformShoppingCartTransformer.transform(created);
}
