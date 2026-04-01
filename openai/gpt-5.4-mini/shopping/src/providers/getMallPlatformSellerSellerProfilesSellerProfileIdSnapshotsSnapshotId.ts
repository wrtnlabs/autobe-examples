import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformSellerProfileSnapshotTransformer } from "../transformers/MallPlatformSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerSellerProfilesSellerProfileIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          seller_profile_id: props.sellerProfileId,
        },
        ...MallPlatformSellerProfileSnapshotTransformer.select(),
      },
    );
  return await MallPlatformSellerProfileSnapshotTransformer.transform(snapshot);
}
