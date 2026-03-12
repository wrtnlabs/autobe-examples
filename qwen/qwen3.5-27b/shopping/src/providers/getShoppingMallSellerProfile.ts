import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function getShoppingMallSellerProfile(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallCustomer> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
  });
  if (seller.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  return {
    id: seller.id,
    email: seller.email,
    display_name: seller.shop_name,
    phone_number: null,
    status: seller.status,
    created_at: seller.created_at.toISOString(),
    updated_at: seller.updated_at.toISOString(),
    deleted_at: null,
  };
}
