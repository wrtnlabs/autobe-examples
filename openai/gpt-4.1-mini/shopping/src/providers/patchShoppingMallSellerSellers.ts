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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellers(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  // Fix seller.type string literal check with typia.assert
  if (typia.assert<"administrator">(props.seller.type) !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
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
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sellersWhereInput = { deleted_at: null };
  if (approval_status !== undefined) {
    where.approval_status = approval_status;
  }
  if (
    rejection_reason !== undefined &&
    rejection_reason !== null &&
    rejection_reason.trim() !== ""
  ) {
    where.rejection_reason = {
      contains: rejection_reason,
      mode: "insensitive",
    };
  }
  // created_at filter with explicit Date to string conversion
  if (created_at_gte !== undefined || created_at_lte !== undefined) {
    where.created_at = {} as Prisma.DateTimeFilter & {
      gte?: string;
      lte?: string;
    };
    if (created_at_gte !== undefined) {
      where.created_at.gte = toISOStringSafe(created_at_gte);
    }
    if (created_at_lte !== undefined) {
      where.created_at.lte = toISOStringSafe(created_at_lte);
    }
  }
  if (suspension_status !== undefined && suspension_status !== null) {
    const suspendedSellerIds = (
      await MyGlobal.prisma.shopping_mall_seller_suspensions.findMany({
        where: { deleted_at: null },
        select: { seller_id: true },
      })
    ).map(({ seller_id }) => seller_id);
    if (suspension_status === true) {
      where.id = { in: suspendedSellerIds };
    } else {
      where.id = { notIn: suspendedSellerIds };
    }
  }
  if (keyword !== undefined && keyword.trim() !== "") {
    where.OR = [
      { shop_name: { contains: keyword, mode: "insensitive" } },
      { shop_description: { contains: keyword, mode: "insensitive" } },
    ];
  }
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({ where });
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const data: IShoppingMallSeller.ISummary[] = sellers.map((seller) => ({
    id: seller.id,
    email: seller.email,
    shopName: seller.shop_name,
    shopDescription:
      seller.shop_description === null ? undefined : seller.shop_description,
    logoUri: seller.logo_uri === null ? undefined : seller.logo_uri,
    approvalStatus: seller.approval_status,
    rejectionReason:
      seller.rejection_reason === null ? undefined : seller.rejection_reason,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
