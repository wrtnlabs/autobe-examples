import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerProfileSnapshotTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProfileSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
        },
        select: {
          id: true,
          shop_name: true,
          shop_description: true,
          logo_uri: true,
          changed_summary: true,
          changed_at: true,
          created_at: true,
          updated_at: true,
          sellerProfile: {
            select: {
              id: true,
              shop_name: true,
              shop_description: true,
              logo_uri: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              shopping_mall_seller_id: true,
              seller: {
                select: {
                  id: true,
                  email: true,
                  approval_status: true,
                  rejection_reason: true,
                  suspended: true,
                  banned: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
    );
  if (snapshot.sellerProfile.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallSellerProfileSnapshotTransformer.transform(snapshot);
}
