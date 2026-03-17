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

export async function getEcommerceMallSuperAdminSellerRegistrationsRegistrationId(props: {
  superAdmin: SuperadminPayload;
  registrationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerRegistration> {
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: {
          id: true,
          status: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          reviewed_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              deleted_at: true,
              created_at: true,
              // approved_at removed - doesn't exist in Prisma schema
            },
          },
          reviewer: {
            select: {
              id: true,
              email: true,
              grade: true,
              deleted_at: true,
              created_at: true,
            },
          },
        },
      },
    );
  return {
    id: registration.id,
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
      deleted_at: registration.seller.deleted_at
        ? toISOStringSafe(registration.seller.deleted_at)
        : null,
      created_at: toISOStringSafe(registration.seller.created_at),
      // approved_at removed - not in schema
    },
    reviewer: registration.reviewer
      ? {
          id: registration.reviewer.id,
          email: registration.reviewer.email,
          grade: registration.reviewer.grade,
          deleted_at: registration.reviewer.deleted_at
            ? toISOStringSafe(registration.reviewer.deleted_at)
            : null,
          created_at: toISOStringSafe(registration.reviewer.created_at),
        }
      : null,
  };
}
