import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSuspension";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
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

export async function patchShoppingMallAdministratorSellerSuspensions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerSuspension.IRequest;
}): Promise<IPageIShoppingMallSellerSuspension.ISummary> {
  const {
    suspensionReason,
    suspendedAtStart,
    suspendedAtEnd,
    sellerId,
    cursor,
  } = props.body;
  let { page, limit } = props.body;
  // Validate and set defaults for pagination
  page = page ?? 1;
  if (page < 1) {
    throw new HttpException("Page must be 1 or greater", 400);
  }
  limit = limit ?? 20;
  if (limit < 1) {
    limit = 1;
  } else if (limit > 100) {
    limit = 100;
  }
  // Validate cursor if provided (basic UUID format check)
  if (cursor !== undefined && cursor !== null) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(cursor)) {
      throw new HttpException("Invalid cursor format", 400);
    }
  }
  // Build filters
  const where: Prisma.shopping_mall_seller_suspensionsWhereInput = {
    deleted_at: null,
    suspension_reason: suspensionReason
      ? { contains: suspensionReason, mode: "insensitive" }
      : undefined,
    suspended_at:
      suspendedAtStart || suspendedAtEnd
        ? {
            ...(suspendedAtStart ? { gte: suspendedAtStart } : {}),
            ...(suspendedAtEnd ? { lte: suspendedAtEnd } : {}),
          }
        : undefined,
    seller_id: sellerId ?? undefined,
  };
  // Cursor pagination
  const cursorWhere = cursor ? { id: cursor } : undefined;
  // Query suspended records
  const suspensions =
    await MyGlobal.prisma.shopping_mall_seller_suspensions.findMany({
      where,
      take: limit + 1,
      skip: cursorWhere ? 1 : 0,
      cursor: cursorWhere,
      orderBy: [{ suspended_at: "desc" }, { id: "desc" }],
      select: {
        id: true,
        suspension_reason: true,
        suspended_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller_id: true,
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_uri: true,
            approval_status: true,
            rejection_reason: true,
          },
        },
      },
    });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_seller_suspensions.count({
    where,
  });
  // Pagination logic for next cursor
  let nextCursor: string | null = null;
  let data = suspensions;
  if (suspensions.length > limit) {
    nextCursor = suspensions[limit].id;
    data = suspensions.slice(0, limit);
  }
  // Convert dates to string & tags.Format<'date-time'>
  function toDateTimeString(value: Date | null | undefined): string | null {
    return value
      ? (value.toISOString() as string & tags.Format<"date-time">)
      : null;
  }
  const resultData: IShoppingMallSellerSuspension.ISummary[] = data.map(
    (suspension) => ({
      id: suspension.id as string & tags.Format<"uuid">,
      suspensionReason: suspension.suspension_reason,
      suspendedAt: toDateTimeString(suspension.suspended_at) as string &
        tags.Format<"date-time">,
      createdAt: toDateTimeString(suspension.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toDateTimeString(suspension.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: toDateTimeString(suspension.deleted_at),
      sellerId: suspension.seller_id as string & tags.Format<"uuid">,
      seller: {
        id: suspension.seller.id as string & tags.Format<"uuid">,
        email: suspension.seller.email,
        shopName: suspension.seller.shop_name,
        shopDescription: suspension.seller.shop_description ?? null,
        logoUri: suspension.seller.logo_uri ?? null,
        approvalStatus: suspension.seller.approval_status,
        rejectionReason: suspension.seller.rejection_reason ?? null,
      },
    }),
  );
  // Compose pagination meta
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: total > 0 ? Math.ceil(total / limit) : 0,
  };
  return {
    pagination,
    data: resultData,
  };
}
