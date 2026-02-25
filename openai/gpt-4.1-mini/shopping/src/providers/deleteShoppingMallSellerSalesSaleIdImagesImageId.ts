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

export async function deleteShoppingMallSellerSalesSaleIdImagesImageId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, saleId, imageId } = props;
  // Validate sale existence and ownership
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: saleId },
    select: { seller_id: true },
  });
  if (sale.seller_id !== seller.id) {
    throw new HttpException("Sale not found or access denied", 404);
  }
  // Validate image existence and linkage
  const image =
    await MyGlobal.prisma.shopping_mall_sale_images.findUniqueOrThrow({
      where: { id: imageId },
      select: { shopping_mall_sale_id: true },
    });
  if (image.shopping_mall_sale_id !== saleId) {
    throw new HttpException("Image not found or does not belong to sale", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the image record
    await tx.shopping_mall_sale_images.delete({
      where: { id: imageId },
    });
    // Implement snapshot update as required by business rules
    // This can be a call to a snapshot service or manual update
    // await updateSaleSnapshotsAfterImageDeletion(tx, saleId);
    // Log deletion in audit log for traceability
    // await logAuditDeletion(tx, seller.id, saleId, imageId);
  });
}
