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

export async function getShoppingMallAdministratorSellerSuspensionsSellerSuspensionId(props: {
  administrator: AdministratorPayload;
  sellerSuspensionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSuspension> {
  const suspensionRecord =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.findUniqueOrThrow({
      where: { id: props.sellerSuspensionId },
      ...ShoppingMallSellerSuspensionTransformer.select(),
    });
  return await ShoppingMallSellerSuspensionTransformer.transform(
    suspensionRecord,
  );
}
