import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  const {
    approval_status,
    rejection_reason,
    created_at_gte,
    created_at_lte,
    suspension_status,
    keyword,
    page = 1,
    limit = 20,
  } = props.body;
  const where: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
    ...(approval_status !== undefined ? { approval_status } : {}),
    ...(rejection_reason !== undefined && rejection_reason !== null
      ? { rejection_reason: { contains: rejection_reason } }
      : {}),
    ...(created_at_gte !== undefined
      ? { created_at: { gte: toISOStringSafe(created_at_gte) } }
      : {}),
    ...(created_at_lte !== undefined
      ? { created_at: { lte: toISOStringSafe(created_at_lte) } }
      : {}),
  };
  if (suspension_status !== undefined && suspension_status !== null) {
    if (suspension_status === true) {
      where.id = {
        in: await MyGlobal.prisma.shopping_mall_seller_suspensions
          .findMany({
            where: { deleted_at: null },
            select: { seller_id: true },
          })
          .then((rows) => rows.map((r) => r.seller_id)),
      };
    } else {
      const suspendedSellerIds =
        await MyGlobal.prisma.shopping_mall_seller_suspensions
          .findMany({
            where: { deleted_at: null },
            select: { seller_id: true },
          })
          .then((rows) => rows.map((r) => r.seller_id));
      where.id = { notIn: suspendedSellerIds };
    }
  }
  if (keyword !== undefined) {
    where.OR = [
      { shop_name: { contains: keyword } },
      { shop_description: { contains: keyword } },
    ];
  }
  const currentPage = Math.max(1, page);
  const pageLimit = Math.min(Math.max(1, limit), 100);
  const skip = (currentPage - 1) * pageLimit;
  const [total, sellers] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.count({ where }),
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      skip,
      take: pageLimit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        shop_name: true,
        shop_description: true,
        logo_uri: true,
        approval_status: true,
        rejection_reason: true,
      },
    }),
  ]);
  return {
    pagination: {
      current: currentPage,
      limit: pageLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / pageLimit),
    },
    data: sellers.map((seller) => ({
      id: seller.id,
      email: seller.email,
      shopName: seller.shop_name,
      shopDescription: seller.shop_description ?? null,
      logoUri: seller.logo_uri ?? null,
      approvalStatus: seller.approval_status,
      rejectionReason: seller.rejection_reason ?? null,
    })),
  };
}
