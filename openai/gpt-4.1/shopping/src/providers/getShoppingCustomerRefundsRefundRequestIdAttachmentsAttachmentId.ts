import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerRefundsRefundRequestIdAttachmentsAttachmentId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundAttachment> {
  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * - Shopping_refund_attachments.attachment_file_id refers to
   *   shopping_product_images, which only has image_uri and order_index (no
   *   file_type, no file_size in model).
   * - IShoppingRefundAttachment requires file_uri, file_type, file_size
   *   properties, but schema provides only image_uri.
   * - Cannot fulfill API contract due to Prisma schema limitations.
   */
  return typia.random<IShoppingRefundAttachment>();
}
