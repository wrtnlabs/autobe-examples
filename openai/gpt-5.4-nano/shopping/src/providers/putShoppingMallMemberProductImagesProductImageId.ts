import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function putShoppingMallMemberProductImagesProductImageId(props: {
  member: MemberPayload;
  productImageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const image = await tx.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.productImageId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        href: true,
        alt_text: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    const product = await tx.shopping_mall_products.findUniqueOrThrow({
      where: { id: image.shopping_mall_product_id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
    if (product.shopping_mall_seller_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (props.body.href !== undefined) {
      if (props.body.href.length < 1) {
        throw new HttpException("href must be non-empty", 400);
      }
    }
    if (props.body.alt_text !== undefined) {
      if (props.body.alt_text.length < 1) {
        throw new HttpException("alt_text must be non-empty", 400);
      }
    }
    if (props.body.display_order !== undefined) {
      if (
        !Number.isInteger(props.body.display_order) ||
        props.body.display_order < 0
      ) {
        throw new HttpException("display_order must be an integer >= 0", 400);
      }
    }
    const needsReorder = props.body.display_order !== undefined;
    if (needsReorder) {
      const desired = props.body.display_order;
      if (desired === undefined) {
        // should be unreachable because needsReorder implies non-undefined
        throw new HttpException("Forbidden", 403);
      }
      const activeImages = await tx.shopping_mall_product_images.findMany({
        where: {
          shopping_mall_product_id: image.shopping_mall_product_id,
          deleted_at: null,
        },
        select: {
          id: true,
          display_order: true,
        },
      });
      const moved = activeImages.find((img) => img.id === image.id);
      if (moved === undefined) {
        throw new HttpException("Forbidden", 403);
      }
      const withoutMoved = activeImages.filter((img) => img.id !== image.id);
      const currentSorted = withoutMoved
        .slice()
        .sort(
          (a, b) =>
            a.display_order - b.display_order || a.id.localeCompare(b.id),
        );
      const bounded = (() => {
        const maxIndex = currentSorted.length;
        if (desired < 0) return 0;
        if (desired > maxIndex) return maxIndex;
        return desired;
      })();
      const newOrderList = [
        ...currentSorted.slice(0, bounded),
        { id: moved.id, display_order: moved.display_order },
        ...currentSorted.slice(bounded),
      ];
      for (let i = 0; i < newOrderList.length; i++) {
        const item = newOrderList[i];
        const nextOrder = i;
        await tx.shopping_mall_product_images.update({
          where: { id: item.id },
          data: { display_order: nextOrder, updated_at: new Date() },
          select: { id: true },
        });
      }
    }
    const updated = await tx.shopping_mall_product_images.update({
      where: { id: props.productImageId },
      data: {
        ...(props.body.href !== undefined && { href: props.body.href }),
        ...(props.body.alt_text !== undefined && {
          alt_text: props.body.alt_text,
        }),
        ...(props.body.display_order !== undefined && {
          display_order: props.body.display_order,
        }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        href: true,
        alt_text: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return {
      id: updated.id,
      shopping_mall_product_id: updated.shopping_mall_product_id,
      href: updated.href,
      alt_text: updated.alt_text,
      display_order: updated.display_order,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    };
  });
}
