import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSellersSellerIdProfileSnapshots(props: {
  admin: AdminPayload;
  sellerId: string;
}): Promise<IShoppingMallSellerProfileSnapshot[]> {
  const snapshots =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: { seller_id: props.sellerId },
      orderBy: { created_at: "desc" },
      take: 50,
      select: {
        id: true,
        seller_id: true,
        name: true,
        description: true,
        logo_url: true,
        created_at: true,
      },
    });
  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    seller_id: snapshot.seller_id,
    name: snapshot.name,
    description: snapshot.description,
    logo_url: snapshot.logo_url,
    created_at: toISOStringSafe(snapshot.created_at),
  }));
}
