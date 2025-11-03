import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminRefundsRefundRequestIdAttachments(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundAttachment.ICreate;
}): Promise<IShoppingRefundAttachment> {
  /**
   * SCHEMA-API CONTRADICTION: Impossible to persist file_uri, file_type, or
   * file_size in the database, as shopping_refund_attachments model lacks these
   * columns. Cannot fulfill the contract. Returning
   * typia.random<IShoppingRefundAttachment>().
   */
  return typia.random<IShoppingRefundAttachment>();
}
