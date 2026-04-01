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

export async function getMallPlatformSellerAccount(props: {
  seller: SellerPayload;
}): Promise<IMallPlatformCustomer> {
  const account = await MyGlobal.prisma.mall_platform_customers.findFirst({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
    ...MallPlatformCustomerTransformer.select(),
  });
  if (account === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await MallPlatformCustomerTransformer.transform(account);
}
