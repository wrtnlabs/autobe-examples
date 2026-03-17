import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminSellersRegistrationsRegistrationIdReview(props: {
  superAdmin: SuperadminPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistration.IReview;
}): Promise<IEcommerceMallSellerRegistration> {
  // Fetch registration and validate it exists and is pending
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUnique({
      where: { id: props.registrationId },
      select: {
        id: true,
        seller_id: true,
        status: true,
        created_at: true,
      } satisfies Prisma.ecommerce_mall_seller_registrationsSelect,
    });
  if (registration === null) {
    throw new HttpException("Seller registration not found", 404);
  }
  if (registration.status !== "pending") {
    throw new HttpException("Registration is not in pending status", 400);
  }
  // Validate rejection reason is provided when rejecting
  if (
    props.body.status === "rejected" &&
    props.body.rejection_reason === null
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a registration",
      400,
    );
  }
  const now = new Date().toISOString();
  // Execute review in transaction: create snapshot and update registration atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot before review for audit trail
    await tx.ecommerce_mall_seller_registration_snapshots.create({
      data: {
        id: v4(),
        registration: { connect: { id: props.registrationId } },
        reviewer: { connect: { id: props.superAdmin.id } },
        created_at: now,
      } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsCreateInput,
    });
    // Update registration with review decision
    await tx.ecommerce_mall_seller_registrations.update({
      where: { id: props.registrationId },
      data: {
        status: props.body.status,
        reviewer: { connect: { id: props.superAdmin.id } },
        reviewed_at: now,
        updated_at: now,
        rejection_reason: props.body.rejection_reason ?? null,
      } satisfies Prisma.ecommerce_mall_seller_registrationsUpdateInput,
    });
    // Update seller approval_status if approved
    if (props.body.status === "approved") {
      await tx.ecommerce_mall_sellers.update({
        where: { id: registration.seller_id },
        data: {
          approval_status: "approved",
          updated_at: now,
        } satisfies Prisma.ecommerce_mall_sellersUpdateInput,
      });
    }
  });
  // Return updated registration data
  return {
    id: registration.id,
    seller_id: registration.seller_id,
    status: props.body.status,
    reviewer_id: props.superAdmin.id,
    rejection_reason: props.body.rejection_reason,
    created_at: registration.created_at.toISOString(),
    updated_at: now,
    reviewed_at: now,
  };
}
