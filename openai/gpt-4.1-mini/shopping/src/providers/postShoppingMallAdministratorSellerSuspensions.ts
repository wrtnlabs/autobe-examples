import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerSuspensionCollector } from "../collectors/ShoppingMallSellerSuspensionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerSuspensionTransformer } from "../transformers/ShoppingMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerSuspensions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerSuspension.ICreate;
}): Promise<IShoppingMallSellerSuspension> {
  // Check if seller exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.body.seller_id },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // Use a transaction to create suspension and fetch created record
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallSellerSuspensionCollector.collect({
      body: props.body,
    });
    const created = await tx.shopping_mall_seller_suspensions.create({
      data,
      ...ShoppingMallSellerSuspensionTransformer.select(),
    });
    const result = await tx.shopping_mall_seller_suspensions.findUniqueOrThrow({
      where: { id: created.id },
      ...ShoppingMallSellerSuspensionTransformer.select(),
    });
    return ShoppingMallSellerSuspensionTransformer.transform(result);
  });
}
