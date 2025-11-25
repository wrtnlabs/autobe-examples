import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminInquiriesInquiryId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInquiry> {
  const inquiry = await MyGlobal.prisma.shopping_mall_inquiries.findUnique({
    where: { id: props.inquiryId },
  });

  if (!inquiry) {
    throw new HttpException("Inquiry not found", 404);
  }

  return {
    id: inquiry.id,
    title: inquiry.title,
    body: inquiry.body,
    inquiry_type: inquiry.inquiry_type,
    priority: inquiry.priority,
    status: inquiry.status,
    created_at: toISOStringSafe(inquiry.created_at),
    updated_at: toISOStringSafe(inquiry.updated_at),
    deleted_at:
      inquiry.deleted_at === null
        ? undefined
        : toISOStringSafe(inquiry.deleted_at),
  };
}
