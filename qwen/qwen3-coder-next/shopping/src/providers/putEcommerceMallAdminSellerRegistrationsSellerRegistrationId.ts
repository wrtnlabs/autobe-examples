import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerRegistrationTransformer } from "../transformers/EcommerceMallSellerRegistrationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminSellerRegistrationsSellerRegistrationId(props: {
  admin: AdminPayload;
  sellerRegistrationId: string;
  body: IEcommerceMallSellerRegistration.IUpdate;
}): Promise<IEcommerceMallSellerRegistration> {
  // Load registration by ID
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.sellerRegistrationId },
      },
    );
  // Validate current status allows update (only pending or rejected can be updated)
  if (
    registration.approval_status !== "pending" &&
    registration.approval_status !== "rejected"
  ) {
    throw new HttpException("Registration status cannot be updated", 400);
  }
  // Validate rejection reason is provided when status is rejected
  if (
    props.body.approval_status === "rejected" &&
    !props.body.rejection_reason
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // Build update data with proper field handling
  const updateData: any = {
    approval_status: props.body.approval_status,
  };
  // Handle optional fields
  if (props.body.shop_name !== undefined) {
    updateData.shop_name = props.body.shop_name;
  }
  if (props.body.shop_description !== undefined) {
    updateData.shop_description = props.body.shop_description;
  }
  if (props.body.logo_url !== undefined) {
    updateData.logo_url = props.body.logo_url;
  }
  if (props.body.rejection_reason !== undefined) {
    updateData.rejection_reason = props.body.rejection_reason;
  }
  // Set responded_at only when status changes to approved or rejected
  if (
    props.body.approval_status === "approved" ||
    props.body.approval_status === "rejected"
  ) {
    updateData.responded_at = new Date().toISOString() as string &
      tags.Format<"date-time">;
  }
  // Update the registration
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
      where: { id: props.sellerRegistrationId },
      data: updateData,
      ...EcommerceMallSellerRegistrationTransformer.select(),
    });
  return await EcommerceMallSellerRegistrationTransformer.transform(updated);
}
