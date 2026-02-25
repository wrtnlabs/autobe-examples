import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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

export async function patchShoppingMallAdministratorSellerApprovals(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerApproval.IRequest;
}): Promise<IPageIShoppingMallSellerApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const where: Prisma.shopping_mall_seller_approvalsWhereInput = {
    deleted_at: null,
    ...(props.body.sellerId && {
      shopping_mall_seller_id: props.body.sellerId,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom || props.body.updatedAtTo
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom && {
              gte: new Date(props.body.updatedAtFrom),
            }),
            ...(props.body.updatedAtTo && {
              lte: new Date(props.body.updatedAtTo),
            }),
          },
        }
      : {}),
  };
  const total = await MyGlobal.prisma.shopping_mall_seller_approvals.count({
    where,
  });
  const pageCount = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.shopping_mall_seller_approvals.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
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
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: pageCount,
    },
    data: records.map((record) => ({
      id: record.id,
      seller: {
        id: record.seller.id,
        email: record.seller.email,
        shopName: record.seller.shop_name,
        shopDescription: record.seller.shop_description ?? null,
        logoUri: record.seller.logo_uri ?? null,
        approvalStatus: record.seller.approval_status,
        rejectionReason: record.seller.rejection_reason ?? null,
      },
      status: typia.assert<"pending" | "approved" | "rejected">(record.status),
      rejectionReason: record.rejection_reason ?? null,
      createdAt: toISOStringSafe(record.created_at ?? new Date(0)),
      updatedAt: toISOStringSafe(record.updated_at ?? new Date(0)),
      deletedAt: toISOStringSafe(record.deleted_at ?? new Date(0)),
    })),
  };
}
