import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductVariantSnapshotsSnapshotIdOptionValuesOptionValueId(props: {
  seller: SellerPayload;
  snapshotId: string;
  optionValueId: string;
}): Promise<IEcommerceMallProductVariantSnapshotOptionValue> {
  const optionValue =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshot_option_values.findFirst(
      {
        where: {
          id: props.optionValueId,
          ecommerce_mall_product_variant_snapshot_id: props.snapshotId,
          productVariantSnapshot: {
            productVariant: {
              product: {
                seller_id: props.seller.id,
                deleted_at: null,
              },
            },
          },
        },
        select: {
          id: true,
          ecommerce_mall_product_variant_snapshot_id: true,
          option_name: true,
          option_value: true,
          created_at: true,
        },
      },
    );
  if (optionValue === null) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: optionValue.id,
    ecommerce_mall_product_variant_snapshot_id:
      optionValue.ecommerce_mall_product_variant_snapshot_id,
    option_name: optionValue.option_name,
    option_value: optionValue.option_value,
    created_at: optionValue.created_at.toISOString(),
  };
}
