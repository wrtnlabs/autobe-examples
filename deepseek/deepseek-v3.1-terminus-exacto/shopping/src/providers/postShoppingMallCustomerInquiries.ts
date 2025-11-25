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

export async function postShoppingMallCustomerInquiries(props: {
  customer: CustomerPayload;
  body: IShoppingMallInquiry.ICreate;
}): Promise<IShoppingMallInquiry> {
  // Verify customer exists and is active
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!customer) {
    throw new HttpException("Customer not found or inactive", 404);
  }

  const inquiryId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const [inquiry] = await MyGlobal.prisma.$transaction([
    // Create main inquiry record
    MyGlobal.prisma.shopping_mall_inquiries.create({
      data: {
        id: inquiryId,
        title: props.body.title,
        body: props.body.body,
        inquiry_type: props.body.inquiry_type,
        priority: props.body.priority,
        status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    // Create customer subtype record
    MyGlobal.prisma.shopping_mall_inquiry_of_customers.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_inquiry_id: inquiryId,
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_customer_session_id: props.customer.session_id,
        created_at: now,
      },
    }),
  ]);

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
