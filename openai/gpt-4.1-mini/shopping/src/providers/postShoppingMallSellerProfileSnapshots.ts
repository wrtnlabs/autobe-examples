import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerProfileSnapshotCollector } from "../collectors/ShoppingMallSellerProfileSnapshotCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProfileSnapshots(props: {
  body: IShoppingMallSellerProfileSnapshot.ICreate;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  try {
    const createdAt = toISOStringSafe(new Date());
    const data = await ShoppingMallSellerProfileSnapshotCollector.collect({
      shop_name: (props.body as any).shop_name ?? "",
      shop_description: (props.body as any).shop_description ?? "",
      logo_image_url: (props.body as any).logo_image_url ?? null,
      seller: { id: (props.body as any).shopping_mall_seller_id ?? "" },
      body: props.body,
    });
    const created =
      await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
        data: {
          ...data,
          created_at: createdAt,
        },
      });
    return {
      id: created.id,
      shop_name: created.shop_name,
      shop_description: created.shop_description,
      logo_image_url: created.logo_image_url ?? null,
      shopping_mall_seller_id: created.shopping_mall_seller_id,
      created_at: created.created_at,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpException("Referenced seller not found", 400);
    }
    throw error;
  }
}
