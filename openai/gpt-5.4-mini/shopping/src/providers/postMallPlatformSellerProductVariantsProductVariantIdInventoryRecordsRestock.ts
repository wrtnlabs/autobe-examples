import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformInventoryRecordCollector } from "../collectors/MallPlatformInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformInventoryRecordTransformer } from "../transformers/MallPlatformInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductVariantsProductVariantIdInventoryRecordsRestock(props: {
  seller: SellerPayload;
  productVariantId: string & tags.Format<"uuid">;
  body: IMallPlatformInventoryRecord.ICreate;
}): Promise<IMallPlatformInventoryRecord> {
  const productVariant =
    await MyGlobal.prisma.mall_platform_product_variants.findFirstOrThrow({
      where: {
        id: props.productVariantId,
        deleted_at: null,
        product: {
          sellerAccount: {
            id: props.seller.id,
          },
        },
      },
      select: {
        id: true,
        product: {
          select: {
            id: true,
            sellerAccount: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  if (props.body.quantityChange <= 0) {
    throw new HttpException("Restock quantity must be positive", 400);
  }
  const created = await MyGlobal.prisma.mall_platform_inventory_records.create({
    data: await MallPlatformInventoryRecordCollector.collect({
      body: props.body,
      productVariant,
    }),
    ...MallPlatformInventoryRecordTransformer.select(),
  });
  return await MallPlatformInventoryRecordTransformer.transform(created);
}
