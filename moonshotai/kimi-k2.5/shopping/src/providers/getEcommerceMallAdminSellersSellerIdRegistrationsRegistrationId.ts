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

export async function getEcommerceMallAdminSellersSellerIdRegistrationsRegistrationId(props: {
  admin: AdminPayload;
  sellerId: string;
  registrationId: string;
}): Promise<IEcommerceMallSellerRegistration> {
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: {
          id: true,
          seller_id: true,
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
          } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
          reviewer: {
            select: {
              id: true,
              email: true,
              grade: true,
              status: true,
              nickname: true,
              created_at: true,
            },
          } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
          registrationSnapshots: {
            select: {
              id: true,
              created_at: true,
              reviewer: {
                select: {
                  id: true,
                  email: true,
                  grade: true,
                  status: true,
                  nickname: true,
                  created_at: true,
                },
              } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
            },
            orderBy: { created_at: "desc" },
          } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsFindManyArgs,
        },
      },
    );
  if (registration.seller_id !== props.sellerId) {
    throw new HttpException(
      "Registration does not belong to the specified seller",
      403,
    );
  }
  return {
    id: registration.id,
    status: registration.status,
    rejectionReason: registration.rejection_reason ?? null,
    createdAt: toISOStringSafe(registration.created_at),
    updatedAt: toISOStringSafe(registration.updated_at),
    reviewedAt: registration.reviewed_at
      ? toISOStringSafe(registration.reviewed_at)
      : null,
    seller: {
      id: registration.seller.id,
      email: registration.seller.email,
      shopName: "",
      approvalStatus: registration.seller.approval_status,
      createdAt: toISOStringSafe(registration.seller.created_at),
      updatedAt: toISOStringSafe(registration.seller.updated_at),
      deletedAt: registration.seller.deleted_at
        ? toISOStringSafe(registration.seller.deleted_at)
        : null,
    },
    reviewer: registration.reviewer
      ? {
          id: registration.reviewer.id,
          email: registration.reviewer.email,
          grade: registration.reviewer.grade,
          status: registration.reviewer.status,
          nickname: registration.reviewer.nickname,
          createdAt: toISOStringSafe(registration.reviewer.created_at),
        }
      : null,
    snapshots: await ArrayUtil.asyncMap(
      registration.registrationSnapshots,
      async (snapshot) => ({
        id: snapshot.id,
        createdAt: toISOStringSafe(snapshot.created_at),
        reviewer: snapshot.reviewer
          ? {
              id: snapshot.reviewer.id,
              email: snapshot.reviewer.email,
              grade: snapshot.reviewer.grade,
              status: snapshot.reviewer.status,
              nickname: snapshot.reviewer.nickname,
              createdAt: toISOStringSafe(snapshot.reviewer.created_at),
            }
          : null,
      }),
    ),
  };
}
