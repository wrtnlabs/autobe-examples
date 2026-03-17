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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminSellerApprovals(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSellerApproval.IRequest;
}): Promise<IPageIShoppingMallSellerApproval.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_sellersWhereInput = {
    ...(body.sellerEmail != null && {
      email: { contains: body.sellerEmail, mode: "insensitive" as const },
    }),
    ...(body.shopName != null && {
      shop_name: { contains: body.shopName, mode: "insensitive" as const },
    }),
    ...(body.sellerKeyword != null && {
      OR: [
        {
          email: { contains: body.sellerKeyword, mode: "insensitive" as const },
        },
        {
          shop_name: {
            contains: body.sellerKeyword,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...((body.submittedAtFrom != null || body.submittedAtTo != null) && {
      created_at: {
        ...(body.submittedAtFrom != null && {
          gte: new Date(body.submittedAtFrom),
        }),
        ...(body.submittedAtTo != null && {
          lte: new Date(body.submittedAtTo),
        }),
      },
    }),
  };
  const orderByDir =
    body.sort?.split(":")[1] === "asc" ? ("asc" as const) : ("desc" as const);
  const records = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: orderByDir },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      email: true,
      shop_name: true,
      is_banned: true,
      is_suspended: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    async (record): Promise<IShoppingMallSellerApproval.ISummary> => ({
      id: record.id,
      status: "pending" as "pending" | "approved" | "rejected",
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(record),
      submittedAt: toISOStringSafe(record.created_at),
      reviewedAt: null,
      rejectionReason: null,
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
