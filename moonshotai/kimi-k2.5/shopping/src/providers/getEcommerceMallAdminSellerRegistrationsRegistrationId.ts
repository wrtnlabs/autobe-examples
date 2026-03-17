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

export async function getEcommerceMallAdminSellerRegistrationsRegistrationId(props: {
  admin: AdminPayload;
  registrationId: string;
}): Promise<IEcommerceMallSellerRegistration> {
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: {
          id: true,
          seller_id: true,
          reviewer_id: true,
          status: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          reviewed_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              created_at: true,
              updated_at: true,
            },
          } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
          reviewer: {
            select: {
              id: true,
              email: true,
              grade: true,
              status: true,
              nickname: true,
              created_at: true,
              updated_at: true,
            },
          } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
        },
      },
    );
  return {
    id: registration.id,
    seller: {
      id: registration.seller.id,
      email: registration.seller.email,
      approval_status: registration.seller.approval_status,
      created_at: toISOStringSafe(registration.seller.created_at),
      updated_at: toISOStringSafe(registration.seller.updated_at),
    },
    reviewer_id: registration.reviewer_id,
    reviewer: registration.reviewer
      ? {
          id: registration.reviewer.id,
          email: registration.reviewer.email,
          grade: registration.reviewer.grade,
          status: registration.reviewer.status,
          nickname: registration.reviewer.nickname,
          created_at: toISOStringSafe(registration.reviewer.created_at),
          updated_at: toISOStringSafe(registration.reviewer.updated_at),
        }
      : null,
    status: registration.status,
    rejection_reason: registration.rejection_reason,
    created_at: toISOStringSafe(registration.created_at),
    updated_at: toISOStringSafe(registration.updated_at),
    reviewed_at: registration.reviewed_at
      ? toISOStringSafe(registration.reviewed_at)
      : null,
  } satisfies IEcommerceMallSellerRegistration;
}
