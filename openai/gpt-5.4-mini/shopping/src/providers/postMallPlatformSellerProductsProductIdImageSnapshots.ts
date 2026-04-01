import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductImageSnapshotTransformer } from "../transformers/MallPlatformProductImageSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductsProductIdImageSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImageSnapshot.ICreate;
}): Promise<IMallPlatformProductImageSnapshot> {
  const product = await MyGlobal.prisma.mall_platform_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        seller_account_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_account_id: true,
      },
    },
  );
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_image_snapshots.create({
      data: {
        id: v4(),
        mall_platform_product_id: props.productId,
        image_url: "",
        image_order: 0,
        is_main: false,
        changed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...MallPlatformProductImageSnapshotTransformer.select(),
    });
  return await MallPlatformProductImageSnapshotTransformer.transform(snapshot);
}
