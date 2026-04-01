import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberProductVariantSnapshotsProductVariantSnapshotId(props: {
  member: MemberPayload;
  productVariantSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: { id: props.productVariantSnapshotId },
        ...ShoppingMallProductVariantSnapshotTransformer.select(),
      },
    );
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: snapshot.shopping_mall_product_variant_id },
      select: { shopping_mall_product_id: true },
    });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: productVariant.shopping_mall_product_id },
      select: { shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return ShoppingMallProductVariantSnapshotTransformer.transform(snapshot);
}
