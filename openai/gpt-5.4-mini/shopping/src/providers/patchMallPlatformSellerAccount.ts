import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformCustomerTransformer } from "../transformers/MallPlatformCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerAccount(props: {
  seller: SellerPayload;
  body: IMallPlatformCustomer.IUpdate;
}): Promise<IMallPlatformCustomer> {
  const current =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      where: {
        id: props.seller.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (current.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.mall_platform_customers.update({
    where: {
      id: props.seller.id,
    },
    data: {
      ...(props.body.email !== undefined ? { email: props.body.email } : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      where: {
        id: props.seller.id,
      },
      ...MallPlatformCustomerTransformer.select(),
    });
  return await MallPlatformCustomerTransformer.transform(updated);
}
