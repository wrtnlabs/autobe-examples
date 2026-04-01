import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformSellerAccountTransformer } from "../transformers/MallPlatformSellerAccountTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerAccountsAccountId(props: {
  customer: CustomerPayload;
  accountId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerAccount> {
  if (props.customer.id !== props.accountId) {
    throw new HttpException("Forbidden", 403);
  }
  const account =
    await MyGlobal.prisma.mall_platform_seller_accounts.findUniqueOrThrow({
      where: {
        id: props.accountId,
      },
      ...MallPlatformSellerAccountTransformer.select(),
    });
  return await MallPlatformSellerAccountTransformer.transform(account);
}
