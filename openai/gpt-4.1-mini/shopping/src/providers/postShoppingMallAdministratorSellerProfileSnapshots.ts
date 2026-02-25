import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerProfileSnapshotTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerProfileSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerProfileSnapshot.ICreate;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  const id: string & tags.Format<"uuid"> = v4();
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_seller_profile_snapshots.create({
      data: {
        id,
        shop_name: props.body.shopName,
        shop_description: props.body.shopDescription,
        logo_image_url: props.body.logoImageUrl ?? null,
        shopping_mall_seller_id: props.body.shoppingMallSellerId,
        created_at: createdAt,
      },
    });
    const snapshot =
      await tx.shopping_mall_seller_profile_snapshots.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          shopping_mall_seller_id: true,
          seller: {
            select: {
              id: true,
            },
          },
          shop_name: true,
          shop_description: true,
          logo_image_url: true,
          created_at: true,
        },
      });
    return await ShoppingMallSellerProfileSnapshotTransformer.transform(
      snapshot,
    );
  });
}
