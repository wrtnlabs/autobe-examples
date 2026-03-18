import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberProductVariantsProductVariantId(props: {
  member: MemberPayload;
  productVariantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.productVariantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        code: true,
        title: true,
        option_value: true,
        price: true,
        is_active: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (variant.product.shopping_mall_seller_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.code.trim().length === 0) {
    throw new HttpException("code is required", 400);
  }
  const duplicate =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: variant.shopping_mall_product_id,
        code: props.body.code,
        id: { not: variant.id },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (duplicate) {
    throw new HttpException("Duplicate SKU code within product", 400);
  }
  // Snapshot base from latest snapshot (to preserve fields not present on mutable row)
  const latestSnapshot =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirst({
      where: {
        shopping_mall_product_variant_id: variant.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: {
        code: true,
        name: true,
        price: true,
        currency: true,
        is_available: true,
        variant_status: true,
        created_at: true,
      },
    });
  const nextCode = props.body.code;
  const nextTitle = props.body.title ?? variant.title;
  const nextOptionValue = props.body.option_value ?? variant.option_value;
  const nextPrice = props.body.price ?? variant.price;
  const nextIsActive = props.body.is_active ?? variant.is_active;
  const currency = latestSnapshot?.currency ?? "KRW";
  const is_available = nextIsActive ? true : false;
  const variant_status =
    latestSnapshot?.variant_status ??
    (nextIsActive ? "available" : "unavailable");
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_variants.update({
      where: { id: variant.id },
      data: {
        code: nextCode,
        title: nextTitle,
        option_value: nextOptionValue,
        price: nextPrice,
        is_active: nextIsActive,
        updated_at: new Date(),
      },
    });
    const snapshot = await tx.shopping_mall_product_variant_snapshots.create({
      data: {
        id: v4() as unknown as string & tags.Format<"uuid">,
        shopping_mall_product_variant_id: variant.id,
        code: nextCode,
        name: nextTitle,
        price: nextPrice,
        currency,
        is_available,
        variant_status,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    void snapshot;
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: variant.id },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
