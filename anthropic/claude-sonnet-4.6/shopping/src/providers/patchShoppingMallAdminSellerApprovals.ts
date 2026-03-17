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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellerApprovals(props: {
  admin: AdminPayload;
  body: IShoppingMallSellerApproval.IRequest;
}): Promise<IPageIShoppingMallSellerApproval.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const andConditions: Prisma.shopping_mall_sellersWhereInput[] = [];
  if (body.sellerEmail != null) {
    andConditions.push({
      email: { contains: body.sellerEmail, mode: "insensitive" },
    });
  }
  if (body.shopName != null) {
    andConditions.push({
      shop_name: { contains: body.shopName, mode: "insensitive" },
    });
  }
  if (body.sellerKeyword != null) {
    andConditions.push({
      OR: [
        { email: { contains: body.sellerKeyword, mode: "insensitive" } },
        { shop_name: { contains: body.sellerKeyword, mode: "insensitive" } },
      ],
    });
  }
  if (body.submittedAtFrom != null) {
    andConditions.push({ created_at: { gte: new Date(body.submittedAtFrom) } });
  }
  if (body.submittedAtTo != null) {
    andConditions.push({ created_at: { lte: new Date(body.submittedAtTo) } });
  }
  const whereInput: Prisma.shopping_mall_sellersWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};
  let orderByInput: Prisma.shopping_mall_sellersOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (body.sort != null) {
    const parts = body.sort.split(":");
    const field = parts[0];
    const direction: "asc" | "desc" = parts[1] === "asc" ? "asc" : "desc";
    if (field === "submittedAt") {
      orderByInput = { created_at: direction };
    }
  }
  const records = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      email: true,
      shop_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      is_banned: true,
      is_suspended: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereInput,
  });
  const data = records.map((record) => {
    const sellerSummary: IShoppingMallSeller.ISummary = {
      id: record.id,
      email: record.email,
      shopName: record.shop_name,
      isBanned: record.is_banned,
      isSuspended: record.is_suspended,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at != null ? toISOStringSafe(record.deleted_at) : null,
    } as unknown as IShoppingMallSeller.ISummary;
    return {
      id: record.id,
      status: "pending" as IShoppingMallSellerApproval.ISummary["status"],
      seller: sellerSummary,
      submittedAt: toISOStringSafe(record.created_at),
      reviewedAt: null,
      rejectionReason: null,
    } as unknown as IShoppingMallSellerApproval.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } as unknown as IPage.IPagination,
    data,
  } as unknown as IPageIShoppingMallSellerApproval.ISummary;
}
