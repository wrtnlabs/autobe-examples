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

export async function postShoppingMallAdministratorSellerSuspensionsSellerIdSuspend(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSuspension.ICreate;
}): Promise<IShoppingMallSellerSuspension> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { id: props.sellerId, deleted_at: null },
    select: { id: true },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  const suspensionReason = props.body.suspension_reason?.trim();
  if (!suspensionReason) {
    throw new HttpException("Suspension reason is required", 400);
  }
  const data = await ShoppingMallSellerSuspensionCollector.collect({
    body: { seller_id: props.sellerId, suspension_reason: suspensionReason },
  });
  const createdSuspension =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.create({
      data,
      ...ShoppingMallSellerSuspensionTransformer.select(),
    });
  return await ShoppingMallSellerSuspensionTransformer.transform(
    createdSuspension,
  );
}
