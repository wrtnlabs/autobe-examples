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

export async function putShoppingMallAdministratorSellerSuspensionsSellerSuspensionId(props: {
  administrator: AdministratorPayload;
  sellerSuspensionId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSuspension.IUpdate;
}): Promise<IShoppingMallSellerSuspension> {
  const existing =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.findUniqueOrThrow({
      where: { id: props.sellerSuspensionId },
      select: { id: true },
    });
  await MyGlobal.prisma.shopping_mall_seller_suspensions.update({
    where: { id: props.sellerSuspensionId },
    data: {
      suspension_reason: props.body.suspensionReason,
      suspended_at: toISOStringSafe(props.body.suspendedAt),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.findUniqueOrThrow({
      where: { id: props.sellerSuspensionId },
      ...ShoppingMallSellerSuspensionTransformer.select(),
    });
  return await ShoppingMallSellerSuspensionTransformer.transform(updated);
}
