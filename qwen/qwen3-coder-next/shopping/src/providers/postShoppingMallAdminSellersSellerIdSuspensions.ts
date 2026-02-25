import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerSuspensionTransformer } from "../transformers/ShoppingMallSellerSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminSellersSellerIdSuspensions(props: {
  admin: AdminPayload;
  sellerId: string;
  body: IShoppingMallSellerSuspension.ICreate;
}): Promise<IShoppingMallSellerSuspension> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
  });
  const suspension =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.create({
      data: await ShoppingMallSellerSuspensionCollector.collect({
        body: props.body,
        shoppingMallSellers: seller,
        shoppingMallAdmins: props.admin,
        shoppingMallAdminSessions: { id: props.admin.session_id },
      }),
      ...ShoppingMallSellerSuspensionTransformer.select(),
    });
  return await ShoppingMallSellerSuspensionTransformer.transform(suspension);
}
