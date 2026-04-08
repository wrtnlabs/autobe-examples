import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function putEcommerceMallAdminRegistrationsRegistrationId(props: {
  admin: AdminPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistration.IUpdate;
}): Promise<IEcommerceMallSellerRegistration> {
  // Fetch the registration
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUnique({
      where: { id: props.registrationId },
      select: {
        id: true,
        seller_id: true,
        status: true,
      },
    });
  if (registration === null) {
    throw new HttpException("Registration not found", 404);
  }
  // Verify status is pending
  if (registration.status !== "pending") {
    throw new HttpException("Registration has already been processed", 400);
  }
  // Validate rejection reason
  if (props.body.status === "rejected" && !props.body.rejectionReason) {
    throw new HttpException(
      "Rejection reason is required when rejecting a registration",
      400,
    );
  }
  const now = new Date();
  // Update the registration
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
    where: { id: props.registrationId },
    data: {
      status: props.body.status,
      reviewer_id: props.admin.id,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejectionReason : null,
      reviewed_at: now,
      updated_at: now,
    },
  });
  // If approved, update seller status
  if (props.body.status === "approved") {
    await MyGlobal.prisma.ecommerce_mall_sellers.update({
      where: { id: registration.seller_id },
      data: {
        approval_status: "approved",
        updated_at: now,
      },
    });
  }
  // Create snapshot for audit trail
  await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registration: {
        connect: {
          id: props.registrationId,
        },
      },
      reviewer: {
        connect: {
          id: props.admin.id,
        },
      },
      created_at: now,
    },
  });
  // Fetch updated registration with all relations
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        ...EcommerceMallSellerRegistrationTransformer.select(),
      },
    );
  return await EcommerceMallSellerRegistrationTransformer.transform(updated);
}
