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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerSuspensionTransformer } from "../transformers/ShoppingMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerSuspensionsSellerIdUnsuspend(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSuspension> {
  // Validate seller exists
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true },
  });
  // Find active suspension
  const suspension =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.findFirst({
      where: {
        seller_id: props.sellerId,
        deleted_at: null,
      },
    });
  if (!suspension) {
    throw new HttpException("Seller is not currently suspended", 404);
  }
  // Soft-delete the suspension by setting deleted_at to current ISO string
  const updatedSuspension =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.update({
      where: { id: suspension.id },
      data: { deleted_at: toISOStringSafe(new Date()) },
      ...ShoppingMallSellerSuspensionTransformer.select(),
    });
  // Transform to return type
  return await ShoppingMallSellerSuspensionTransformer.transform(
    updatedSuspension,
  );
}
