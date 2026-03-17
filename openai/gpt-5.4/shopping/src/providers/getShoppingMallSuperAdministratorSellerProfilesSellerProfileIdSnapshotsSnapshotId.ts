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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallSellerProfileSnapshotTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdministratorSellerProfilesSellerProfileIdSnapshotsSnapshotId(props: {
  superAdministrator: SuperadministratorPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
    where: {
      id: props.sellerProfileId,
    },
    select: {
      id: true,
    },
  });
  const snapshot =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          shopping_mall_seller_profile_id: props.sellerProfileId,
        },
        ...ShoppingMallSellerProfileSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallSellerProfileSnapshotTransformer.transform(snapshot);
}
