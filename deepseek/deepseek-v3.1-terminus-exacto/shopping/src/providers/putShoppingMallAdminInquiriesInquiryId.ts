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

export async function putShoppingMallAdminInquiriesInquiryId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallInquiry.IUpdate;
}): Promise<IShoppingMallInquiry> {
  // Check if the inquiry exists
  const existingInquiry =
    await MyGlobal.prisma.shopping_mall_inquiries.findUnique({
      where: { id: props.inquiryId },
    });

  if (!existingInquiry) {
    throw new HttpException("Inquiry not found", 404);
  }

  // Update the inquiry with provided fields
  const updated = await MyGlobal.prisma.shopping_mall_inquiries.update({
    where: { id: props.inquiryId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.body !== undefined && { body: props.body.body }),
      ...(props.body.inquiry_type !== undefined && {
        inquiry_type: props.body.inquiry_type,
      }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated inquiry with proper type conversion
  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    inquiry_type: updated.inquiry_type,
    priority: updated.priority,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
