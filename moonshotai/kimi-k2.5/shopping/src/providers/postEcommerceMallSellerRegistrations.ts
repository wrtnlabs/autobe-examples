import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerRegistrationCollector } from "../collectors/EcommerceMallSellerRegistrationCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerRegistrations(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerRegistration.ICreate;
}): Promise<IEcommerceMallSellerRegistration> {
  // Check for existing active or pending registration
  const existing =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findFirst({
      where: {
        seller_id: props.seller.id,
        status: { in: ["pending", "approved"] },
      },
    });
  if (existing !== null) {
    throw new HttpException(
      "Seller already has an active or pending registration",
      409,
    );
  }
  // Create registration and snapshot in transaction
  const registration = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.ecommerce_mall_seller_registrations.create({
      data: await EcommerceMallSellerRegistrationCollector.collect({
        body: props.body,
        seller: props.seller,
      }),
    });
    await tx.ecommerce_mall_seller_registration_snapshots.create({
      data: {
        id: v4(),
        registration: { connect: { id: created.id } },
        created_at: new Date(),
      },
    });
    await tx.ecommerce_mall_sellers.update({
      where: { id: props.seller.id },
      data: { approval_status: "pending" },
    });
    return created;
  });
  // Fetch seller for response
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.seller.id },
    },
  );
  // Fetch reviewer if exists
  const reviewer = registration.reviewer_id
    ? await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
        where: { id: registration.reviewer_id },
      })
    : null;
  return {
    id: registration.id,
    status: registration.status,
    rejectionReason: registration.rejection_reason,
    createdAt: registration.created_at.toISOString(),
    updatedAt: registration.updated_at.toISOString(),
    reviewedAt: registration.reviewed_at?.toISOString() ?? null,
    seller: {
      id: seller.id,
      email: seller.email,
      shopName: "",
      approvalStatus: seller.approval_status,
      createdAt: seller.created_at.toISOString(),
      updatedAt: seller.updated_at.toISOString(),
      deletedAt: seller.deleted_at?.toISOString() ?? null,
    },
    reviewer: reviewer
      ? {
          id: reviewer.id,
          email: reviewer.email,
          grade: reviewer.grade,
          status: reviewer.status,
          nickname: reviewer.nickname ?? null,
          createdAt: reviewer.created_at.toISOString(),
        }
      : null,
  };
}
