import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallMemberProductImagesProductImageId(props: {
  member: MemberPayload;
  productImageId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const image = await tx.shopping_mall_product_images.findFirstOrThrow({
      where: {
        id: props.productImageId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        display_order: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
    if (image.product.shopping_mall_seller_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    const deletedAt = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    await tx.shopping_mall_product_images.update({
      where: { id: image.id },
      data: {
        deleted_at: deletedAt,
        updated_at: new Date(),
      },
    });
  });
}
