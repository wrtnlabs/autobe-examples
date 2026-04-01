import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductVariantSnapshotTransformer } from "../transformers/MallPlatformProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerProductsProductIdVariantSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshot.ICreate;
}): Promise<IMallPlatformProductVariantSnapshot> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
        deleted_at: true,
        variants: {
          where: { deleted_at: null },
          orderBy: { created_at: "asc" },
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price_override: true,
          },
        },
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product is unavailable", 404);
  }
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.variants.length === 0) {
    throw new HttpException(
      "Product variants are required for snapshot creation",
      400,
    );
  }
  const created =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.create({
      data: {
        id: v4(),
        mall_platform_product_id: product.id,
        mall_platform_product_variant_id: product.variants[0].id,
        sku_code: product.variants[0].sku_code,
        option_summary: product.variants[0].option_values,
        price_override: product.variants[0].price_override,
        snapshot_reason: null,
        created_at: new Date(),
      },
      ...MallPlatformProductVariantSnapshotTransformer.select(),
    });
  return await MallPlatformProductVariantSnapshotTransformer.transform(created);
}
