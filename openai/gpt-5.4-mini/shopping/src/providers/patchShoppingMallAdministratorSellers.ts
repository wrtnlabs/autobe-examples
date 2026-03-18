import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallAdministratorSellers(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
    ...(props.body.approvalStatus !== undefined
      ? { approval_status: props.body.approvalStatus }
      : {}),
    ...(props.body.accountStatus !== undefined
      ? { account_status: props.body.accountStatus }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { email: { contains: props.body.search, mode: "insensitive" } },
            {
              sellerProfile: {
                is: {
                  shop_name: {
                    contains: props.body.search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
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
          shop_name: true,
          shop_description: true,
          logo_image_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const records: number = await MyGlobal.prisma.shopping_mall_sellers.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (seller) => {
      return {
        id: seller.id,
        email: seller.email,
        approvalStatus: seller.approval_status,
        rejectionReason: seller.rejection_reason,
        accountStatus: seller.account_status,
        approvedAt: seller.approved_at?.toISOString() ?? null,
        rejectedAt: seller.rejected_at?.toISOString() ?? null,
        suspendedAt: seller.suspended_at?.toISOString() ?? null,
        bannedAt: seller.banned_at?.toISOString() ?? null,
        lastLoginAt: seller.last_login_at?.toISOString() ?? null,
        createdAt: seller.created_at.toISOString(),
        updatedAt: seller.updated_at.toISOString(),
        deletedAt: seller.deleted_at?.toISOString() ?? null,
        sellerProfile: seller.sellerProfile
          ? ({
              id: seller.sellerProfile.id,
              shopName: seller.sellerProfile.shop_name,
              shopDescription: seller.sellerProfile.shop_description,
              logoImageUrl: seller.sellerProfile.logo_image_url,
              created_at: seller.sellerProfile.created_at.toISOString(),
              updated_at: seller.sellerProfile.updated_at.toISOString(),
              deleted_at:
                seller.sellerProfile.deleted_at?.toISOString() ?? null,
            } satisfies IShoppingMallSellerProfile.ISummary)
          : null,
      } satisfies IShoppingMallSeller.ISummary;
    }),
  };
}
