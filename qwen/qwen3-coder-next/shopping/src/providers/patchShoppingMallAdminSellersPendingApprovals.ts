import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function patchShoppingMallAdminSellersPendingApprovals(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSellerProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.shopping_mall_sellersWhereInput = {
    approval_status: "pending",
  };
  // Add search filter if provided
  if (props.body.search) {
    where.shop_name = { contains: props.body.search, mode: "insensitive" };
  }
  // Build order by clause
  const orderBy: Prisma.shopping_mall_sellersOrderByWithRelationInput = {};
  if (props.body.sort) {
    if (props.body.sort === "created_at:asc") {
      orderBy.created_at = "asc";
    } else if (props.body.sort === "created_at:desc") {
      orderBy.created_at = "desc";
    } else if (props.body.sort === "shop_name:asc") {
      orderBy.shop_name = "asc";
    } else if (props.body.sort === "shop_name:desc") {
      orderBy.shop_name = "desc";
    }
  } else {
    orderBy.created_at = "desc";
  }
  // Fetch data
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      shop_name: true,
      shop_description: true,
      logo_image_url: true,
      approval_status: true,
      created_at: true,
    },
  });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where,
  });
  // Transform to response DTOs
  const transformedData: IShoppingMallSellerProfile.ISummary[] = data.map(
    (seller) => ({
      id: seller.id,
      shop_name: seller.shop_name,
      shop_description:
        seller.shop_description === null ? undefined : seller.shop_description,
      logo_image_url:
        seller.logo_image_url === null ? undefined : seller.logo_image_url,
      approval_status: seller.approval_status as
        | "pending"
        | "approved"
        | "rejected",
      created_at: toISOStringSafe(seller.created_at),
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
