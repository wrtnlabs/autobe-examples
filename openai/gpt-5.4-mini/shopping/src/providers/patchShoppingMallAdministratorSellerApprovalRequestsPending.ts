import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function patchShoppingMallAdministratorSellerApprovalRequestsPending(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerApprovalRequest.IRequest;
}): Promise<IPageIShoppingMallSellerApprovalRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const orderBy: Prisma.shopping_mall_seller_approval_requestsOrderByWithRelationInput =
    props.body.sort === null || props.body.sort === "created_at_desc"
      ? { created_at: "desc" }
      : props.body.sort === "created_at_asc"
        ? { created_at: "asc" }
        : props.body.sort === "updated_at_desc"
          ? { updated_at: "desc" }
          : props.body.sort === "updated_at_asc"
            ? { updated_at: "asc" }
            : (() => {
                throw new HttpException("Invalid sort key", 400);
              })();
  const where: Prisma.shopping_mall_seller_approval_requestsWhereInput = {
    status: "pending",
    ...(props.body.shoppingMallSellerId !== null && {
      shopping_mall_seller_id: props.body.shoppingMallSellerId,
    }),
    ...(props.body.rejectionReason !== null && {
      rejection_reason: {
        contains: props.body.rejectionReason,
        mode: "insensitive",
      },
    }),
    ...(props.body.createdAtFrom !== null || props.body.createdAtTo !== null
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== null && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== null && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom !== null || props.body.updatedAtTo !== null
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom !== null && {
              gte: new Date(props.body.updatedAtFrom),
            }),
            ...(props.body.updatedAtTo !== null && {
              lte: new Date(props.body.updatedAtTo),
            }),
          },
        }
      : {}),
  };
  const skip: number = (page - 1) * limit;
  const rows =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findMany({
      where,
      orderBy: [orderBy, { id: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            rejection_reason: true,
            account_status: true,
            approved_at: true,
            rejected_at: true,
            suspended_at: true,
            banned_at: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            sellerProfile: {
              select: {
                id: true,
                shopping_mall_seller_id: true,
                shop_name: true,
                shop_description: true,
                logo_image_url: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      seller: {
        id: row.seller.id,
        email: row.seller.email,
        approvalStatus: row.seller.approval_status,
        rejectionReason: row.seller.rejection_reason,
        accountStatus: row.seller.account_status,
        approvedAt: row.seller.approved_at?.toISOString() ?? null,
        rejectedAt: row.seller.rejected_at?.toISOString() ?? null,
        suspendedAt: row.seller.suspended_at?.toISOString() ?? null,
        bannedAt: row.seller.banned_at?.toISOString() ?? null,
        lastLoginAt: row.seller.last_login_at?.toISOString() ?? null,
        createdAt: row.seller.created_at.toISOString(),
        updatedAt: row.seller.updated_at.toISOString(),
        deletedAt: row.seller.deleted_at?.toISOString() ?? null,
        sellerProfile:
          row.seller.sellerProfile === null
            ? null
            : {
                id: row.seller.sellerProfile.id,
                seller: {
                  id: row.seller.id,
                  email: row.seller.email,
                  approvalStatus: row.seller.approval_status,
                  rejectionReason: row.seller.rejection_reason,
                  accountStatus: row.seller.account_status,
                  approvedAt: row.seller.approved_at?.toISOString() ?? null,
                  rejectedAt: row.seller.rejected_at?.toISOString() ?? null,
                  suspendedAt: row.seller.suspended_at?.toISOString() ?? null,
                  bannedAt: row.seller.banned_at?.toISOString() ?? null,
                  lastLoginAt: row.seller.last_login_at?.toISOString() ?? null,
                  createdAt: row.seller.created_at.toISOString(),
                  updatedAt: row.seller.updated_at.toISOString(),
                  deletedAt: row.seller.deleted_at?.toISOString() ?? null,
                  sellerProfile: null as never,
                },
                shopName: row.seller.sellerProfile.shop_name,
                shopDescription: row.seller.sellerProfile.shop_description,
                logoImageUrl: row.seller.sellerProfile.logo_image_url,
                created_at: row.seller.sellerProfile.created_at.toISOString(),
                updated_at: row.seller.sellerProfile.updated_at.toISOString(),
                deleted_at:
                  row.seller.sellerProfile.deleted_at?.toISOString() ?? null,
              },
      } satisfies IShoppingMallSeller.ISSummary,
      status: row.status,
      rejectionReason: row.rejection_reason,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    })),
  };
}
