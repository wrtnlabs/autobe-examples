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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminRegistrationsRegistrationId(props: {
  admin: AdminPayload;
  registrationId: string;
}): Promise<IEcommerceMallSellerRegistration> {
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: {
          id: props.registrationId,
        },
        select: {
          id: true,
          seller_id: true,
          reviewer_id: true,
          status: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          reviewed_at: true,
        },
      },
    );
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: registration.seller_id },
      select: {
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const reviewer = registration.reviewer_id
    ? await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
        where: { id: registration.reviewer_id },
        select: {
          id: true,
          email: true,
          grade: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      })
    : null;
  const result = {
    id: registration.id,
    seller_id: registration.seller_id,
    reviewer_id: registration.reviewer_id,
    status: registration.status,
    rejection_reason: registration.rejection_reason,
    created_at: toISOStringSafe(registration.created_at),
    updated_at: toISOStringSafe(registration.updated_at),
    reviewed_at:
      registration.reviewed_at !== null
        ? toISOStringSafe(registration.reviewed_at)
        : null,
    seller: {
      id: seller.id,
      email: seller.email,
      approval_status: seller.approval_status,
      created_at: toISOStringSafe(seller.created_at),
      updated_at: toISOStringSafe(seller.updated_at),
      deleted_at:
        seller.deleted_at !== null ? toISOStringSafe(seller.deleted_at) : null,
    },
    reviewer:
      reviewer !== null
        ? {
            id: reviewer.id,
            email: reviewer.email,
            grade: reviewer.grade,
            created_at: toISOStringSafe(reviewer.created_at),
            updated_at: toISOStringSafe(reviewer.updated_at),
            deleted_at:
              reviewer.deleted_at !== null
                ? toISOStringSafe(reviewer.deleted_at)
                : null,
          }
        : null,
  };
  return result;
}
