import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
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

export async function patchEcommerceMallAdminSellerRegistrationSnapshots(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerRegistrationSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerRegistrationSnapshot> {
  const page = props.body.page ?? 1;
  const limit =
    props.body.limit !== undefined && props.body.limit !== null
      ? Math.min(props.body.limit, 100)
      : 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const whereInput: Prisma.ecommerce_mall_seller_registration_snapshotsWhereInput =
    {
      ...(props.body.registrationId !== undefined &&
      props.body.registrationId !== null
        ? { ecommerce_mall_seller_registration_id: props.body.registrationId }
        : {}),
      ...(props.body.reviewerId !== undefined && props.body.reviewerId !== null
        ? { ecommerce_mall_admin_id: props.body.reviewerId }
        : {}),
      ...((props.body.createdAtFrom !== undefined &&
        props.body.createdAtFrom !== null) ||
      (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null)
        ? {
            created_at: {
              ...(props.body.createdAtFrom !== undefined &&
              props.body.createdAtFrom !== null
                ? { gte: new Date(props.body.createdAtFrom) }
                : {}),
              ...(props.body.createdAtTo !== undefined &&
              props.body.createdAtTo !== null
                ? { lte: new Date(props.body.createdAtTo) }
                : {}),
            },
          }
        : {}),
    };
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortDirection,
      } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsOrderByWithRelationInput,
      select: {
        id: true,
        created_at: true,
        registration: {
          select: {
            id: true,
            status: true,
            rejection_reason: true,
            created_at: true,
            updated_at: true,
            reviewed_at: true,
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
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.count({
      where: whereInput,
    }),
  ]);
  const data: IEcommerceMallSellerRegistrationSnapshot[] = snapshots.map(
    (snapshot) => ({
      id: snapshot.id,
      createdAt: toISOStringSafe(snapshot.created_at),
      registration: snapshot.registration,
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
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
