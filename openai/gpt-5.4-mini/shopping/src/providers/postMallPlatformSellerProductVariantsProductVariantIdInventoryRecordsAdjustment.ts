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

export async function postMallPlatformSellerProductVariantsProductVariantIdInventoryRecordsAdjustment(props: {
  seller: SellerPayload;
  productVariantId: string & tags.Format<"uuid">;
  body: IMallPlatformInventoryRecord.ICreate;
}): Promise<IMallPlatformInventoryRecord> {
  const productVariant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.productVariantId },
      select: {
        id: true,
        product: {
          select: {
            sellerAccount: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  if (productVariant.product.sellerAccount.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.quantityChange >= 0) {
    throw new HttpException(
      "Inventory adjustment must reduce stock with a negative quantity change.",
      400,
    );
  }
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Inventory adjustment reason is required.", 400);
  }
  const created = await MyGlobal.prisma.mall_platform_inventory_records.create({
    data: await MallPlatformInventoryRecordCollector.collect({
      body: props.body,
      productVariant: productVariant,
    }),
    ...MallPlatformInventoryRecordTransformer.select(),
  });
  return await MallPlatformInventoryRecordTransformer.transform(created);
}
