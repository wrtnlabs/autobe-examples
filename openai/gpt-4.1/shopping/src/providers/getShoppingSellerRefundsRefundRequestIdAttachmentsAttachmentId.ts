import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerRefundsRefundRequestIdAttachmentsAttachmentId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundAttachment> {
  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * - The OpenAPI DTO IShoppingRefundAttachment requires fields file_uri,
   *   file_type, file_size
   * - The Prisma model shopping_refund_attachments does NOT have these fields as
   *   per current schema
   * - Therefore, implementation cannot provide these properties from the database
   *   Resolution: Returning typia.random<IShoppingRefundAttachment>()
   *
   * @todo Add these fields to shopping_refund_attachments schema or adjust the
   *   API contract
   */
  return typia.random<IShoppingRefundAttachment>();
}
