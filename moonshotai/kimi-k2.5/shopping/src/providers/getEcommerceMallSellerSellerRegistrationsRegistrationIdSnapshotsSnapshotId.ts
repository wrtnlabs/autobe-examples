import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellerRegistrationsRegistrationIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  registrationId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerRegistrationSnapshot> {
  // Fetch snapshot with extended registration select to include seller_id for auth check
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          created_at: true,
          ecommerce_mall_seller_registration_id: true,
          ecommerce_mall_admin_id: true,
          registration: {
            select: {
              id: true,
              seller_id: true,
            },
          } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs,
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
      },
    );
  // Verify the snapshot belongs to the specified registration
  if (snapshot.registration.id !== props.registrationId) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Verify the seller owns this registration
  if (snapshot.registration.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform to DTO manually since we're not using the transformer select
  return {
    id: snapshot.id,
    createdAt: snapshot.created_at.toISOString(),
    registration: {
      id: snapshot.registration.id,
    } satisfies IEcommerceMallSellerRegistration,
    reviewer: snapshot.reviewer
      ? ({
          id: snapshot.reviewer.id,
          email: snapshot.reviewer.email,
          grade: snapshot.reviewer.grade,
          status: snapshot.reviewer.status,
          nickname: snapshot.reviewer.nickname,
          createdAt: snapshot.reviewer.created_at.toISOString(),
        } satisfies IEcommerceMallAdmin.ISummary)
      : null,
  };
}
