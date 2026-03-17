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
import { ShoppingMallSellerProfileSnapshotCollector } from "../collectors/ShoppingMallSellerProfileSnapshotCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerProfileSnapshotTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerProfilesSellerProfileIdSnapshots(props: {
  administrator: AdministratorPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfileSnapshot.ICreate;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: {
        id: props.sellerProfileId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (sellerProfile.deleted_at !== null)
    throw new HttpException("Forbidden", 403);
  if (props.body.changedSummary.trim().length === 0)
    throw new HttpException("Invalid changed summary", 400);
  if (props.body.shopName.trim().length === 0)
    throw new HttpException("Invalid shop name", 400);
  if (Number.isNaN(new Date(props.body.changedAt).getTime()) === true)
    throw new HttpException("Invalid changedAt", 400);
  const created =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
      data: await ShoppingMallSellerProfileSnapshotCollector.collect({
        body: props.body,
        sellerProfile: {
          id: sellerProfile.id,
        },
      }),
      ...ShoppingMallSellerProfileSnapshotTransformer.select(),
    });
  return await ShoppingMallSellerProfileSnapshotTransformer.transform(created);
}
