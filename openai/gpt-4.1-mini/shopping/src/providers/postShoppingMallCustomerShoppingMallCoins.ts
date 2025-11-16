import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallCoins(props: {
  customer: CustomerPayload;
  body: IShoppingMallCoin.ICreate;
}): Promise<IShoppingMallCoin> {
  throw new HttpException(
    "The shopping_mall_channel_id is required and must be set in the provider implementation.",
    400,
  );
}
