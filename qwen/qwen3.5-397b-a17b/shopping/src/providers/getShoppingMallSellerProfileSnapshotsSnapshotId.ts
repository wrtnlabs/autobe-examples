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
  const record =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        where: { id: props.snapshotId },
        ...ShoppingMallSellerProfileSnapshotTransformer.select(),
      },
    );
  if (record.sellerProfile.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallSellerProfileSnapshotTransformer.transform(record);
}
