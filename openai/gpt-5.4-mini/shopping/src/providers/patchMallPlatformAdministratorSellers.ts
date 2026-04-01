import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSellers(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformSeller.IRequest;
}): Promise<IPageIMallPlatformSeller.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const where: Prisma.mall_platform_sellersWhereInput = {
    ...(props.body.email !== undefined && { email: props.body.email }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.deletedAt === true
      ? { deleted_at: { not: null } }
      : props.body.deletedAt === false
        ? { deleted_at: null }
        : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { email: { contains: props.body.search, mode: "insensitive" } },
            { status: { contains: props.body.search, mode: "insensitive" } },
            {
              rejection_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_sellersOrderByWithRelationInput[] = [
    props.body.sort === "email"
      ? { email: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "status"
        ? { status: props.body.order === "asc" ? "asc" : "desc" }
        : props.body.sort === "createdAt"
          ? { created_at: props.body.order === "asc" ? "asc" : "desc" }
          : { created_at: "desc" },
    { id: "asc" },
  ];
  const data = await MyGlobal.prisma.mall_platform_sellers.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
    select: {
      id: true,
      email: true,
      status: true,
      rejection_reason: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  const records = await MyGlobal.prisma.mall_platform_sellers.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (seller) => ({
      id: seller.id,
      email: seller.email,
      status: seller.status,
      rejectionReason: seller.rejection_reason,
      createdAt: toISOStringSafe(seller.created_at),
      updatedAt: toISOStringSafe(seller.updated_at),
      deletedAt:
        seller.deleted_at === null ? null : toISOStringSafe(seller.deleted_at),
    })),
  };
}
