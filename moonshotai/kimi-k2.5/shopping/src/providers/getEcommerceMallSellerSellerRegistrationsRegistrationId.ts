import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminTransformer } from "../transformers/EcommerceMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellerRegistrationsRegistrationId(props: {
  seller: SellerPayload;
  registrationId: string;
}): Promise<IEcommerceMallSellerRegistration> {
  // Query registration with nested relations
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
              deleted_at: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              email: true,
              grade: true,
              status: true,
              nickname: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  // Authorization check - seller can only access their own registrations
  if (registration.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform to response DTO
  return {
    id: registration.id,
    seller_id: registration.seller_id,
    reviewer_id: registration.reviewer_id,
    status: registration.status,
    rejection_reason: registration.rejection_reason,
    created_at: toISOStringSafe(registration.created_at),
    updated_at: toISOStringSafe(registration.updated_at),
    reviewed_at: registration.reviewed_at
      ? toISOStringSafe(registration.reviewed_at)
      : null,
    seller: {
      id: registration.seller.id,
      email: registration.seller.email,
      approval_status: registration.seller.approval_status,
      created_at: toISOStringSafe(registration.seller.created_at),
      updated_at: toISOStringSafe(registration.seller.updated_at),
      deleted_at: registration.seller.deleted_at
        ? toISOStringSafe(registration.seller.deleted_at)
        : null,
    },
    reviewer: registration.reviewer
      ? await EcommerceMallAdminTransformer.transform(registration.reviewer)
      : null,
  };
}
