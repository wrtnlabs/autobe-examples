import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantSnapshotOptionValueTransformer } from "../transformers/ShoppingMallProductVariantSnapshotOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSellerProductsProductIdVariantsVariantIdSnapshotsProductVariantSnapshotIdOptionValuesOptionValueId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  productVariantSnapshotId: string & tags.Format<"uuid">;
  optionValueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantSnapshotOptionValue> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirstOrThrow(
    {
      where: {
        id: props.productVariantSnapshotId,
        shopping_mall_product_variant_id: props.variantId,
      },
      select: {
        id: true,
      },
    },
  );
  const optionValue =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshot_option_values.findFirstOrThrow(
      {
        where: {
          id: props.optionValueId,
          shopping_mall_product_variant_snapshot_id:
            props.productVariantSnapshotId,
        },
        ...ShoppingMallProductVariantSnapshotOptionValueTransformer.select(),
      },
    );
  return await ShoppingMallProductVariantSnapshotOptionValueTransformer.transform(
    optionValue,
  );
}
