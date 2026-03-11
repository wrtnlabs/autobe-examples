import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerAtPublicTransformer } from "../transformers/ShoppingMallSellerAtPublicTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSellersSellerId(props: {
  customer: CustomerPayload;
  sellerId: string;
}): Promise<IShoppingMallSeller.IPublic> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
    where: {
      id: props.sellerId,
      approval_status: "approved",
      banned: false,
      deleted_at: null,
    },
    ...ShoppingMallSellerAtPublicTransformer.select(),
  });
  return await ShoppingMallSellerAtPublicTransformer.transform(seller);
}
