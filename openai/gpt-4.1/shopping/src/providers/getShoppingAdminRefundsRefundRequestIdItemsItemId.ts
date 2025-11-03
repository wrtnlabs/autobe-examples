import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminRefundsRefundRequestIdItemsItemId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundRequestItem> {
  const item = await MyGlobal.prisma.shopping_refund_request_items.findFirst({
    where: {
      id: props.itemId,
      shopping_refund_request_id: props.refundRequestId,
    },
  });
  if (!item) {
    throw new HttpException("Refund request item not found", 404);
  }

  const attachmentsRaw =
    await MyGlobal.prisma.shopping_refund_attachments.findMany({
      where: {
        shopping_refund_request_id: item.shopping_refund_request_id,
        shopping_refund_request_item_id: item.id,
      },
      orderBy: { uploaded_at: "asc" },
    });
  const attachments =
    attachmentsRaw.length > 0
      ? await Promise.all(
          attachmentsRaw.map(async (att) => {
            const file =
              await MyGlobal.prisma.shopping_product_images.findUnique({
                where: { id: att.attachment_file_id },
              });
            if (!file) {
              throw new HttpException(
                `Attachment file not found for id ${att.attachment_file_id}`,
                500,
              );
            }
            return {
              id: att.id,
              shopping_refund_request_id: att.shopping_refund_request_id,
              shopping_refund_request_item_id:
                att.shopping_refund_request_item_id ?? undefined,
              attachment_file_id: att.attachment_file_id,
              attachment_type: att.attachment_type,
              description: att.description ?? undefined,
              uploaded_at: toISOStringSafe(att.uploaded_at),
              file_uri: file.image_uri,
              file_type:
                file.image_uri.split(".").pop()?.toLowerCase() === "jpg" ||
                file.image_uri.split(".").pop()?.toLowerCase() === "jpeg"
                  ? "image/jpeg"
                  : file.image_uri.split(".").pop()?.toLowerCase() === "png"
                    ? "image/png"
                    : "application/octet-stream",
              file_size: (file as any).file_size ?? 0,
            };
          }),
        )
      : undefined;

  return {
    id: item.id,
    shopping_refund_request_id: item.shopping_refund_request_id,
    shopping_order_id: item.shopping_order_id,
    shopping_order_line_id: item.shopping_order_line_id,
    quantity: item.quantity,
    item_business_reason: item.item_business_reason ?? undefined,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    attachments: attachments,
  };
}
