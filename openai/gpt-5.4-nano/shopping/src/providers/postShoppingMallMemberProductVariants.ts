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

export async function postShoppingMallMemberProductVariants(props: {
  member: MemberPayload;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const product = await tx.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_product_id },
      select: { id: true, shopping_mall_seller_id: true },
    });
    if (product.shopping_mall_seller_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (props.body.code.trim().length === 0) {
      throw new HttpException("Variant code is required", 400);
    }
    if (props.body.title.trim().length === 0) {
      throw new HttpException("Variant title is required", 400);
    }
    if (props.body.option_value.trim().length === 0) {
      throw new HttpException("Variant option_value is required", 400);
    }
    const duplicate = await tx.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        code: props.body.code,
      },
      select: { id: true },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Duplicate variant SKU code within the product",
        409,
      );
    }
    const now = new Date();
    const id = v4();
    const created = await tx.shopping_mall_product_variants.create({
      data: {
        id,
        created_at: now,
        updated_at: now,
        code: props.body.code,
        title: props.body.title,
        option_value: props.body.option_value,
        price: props.body.price,
        is_active: props.body.is_active,
        deleted_at: null,
        product: { connect: { id: props.body.shopping_mall_product_id } },
      },
      ...ShoppingMallProductVariantTransformer.select(),
    });
    return await ShoppingMallProductVariantTransformer.transform(
      created as unknown as Parameters<
        typeof ShoppingMallProductVariantTransformer.transform
      >[0],
    );
  });
}
