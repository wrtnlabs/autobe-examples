import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerInquiriesInquiryId(props: {
  customer: CustomerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IShoppingMallInquiry.IUpdate;
}): Promise<IShoppingMallInquiry> {
  // First verify the inquiry exists and belongs to the customer
  const inquiry = await MyGlobal.prisma.shopping_mall_inquiries.findFirst({
    where: {
      id: props.inquiryId,
      deleted_at: null,
      shopping_mall_inquiry_of_customers: {
        shopping_mall_customer_id: props.customer.id,
      },
    },
  });

  if (!inquiry) {
    throw new HttpException("Inquiry not found or access denied", 404);
  }

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
      updated_at: new Date(),
    },
  });

  // Convert Date objects to ISO strings for API response
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
