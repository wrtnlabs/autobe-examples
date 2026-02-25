import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerAccessLogs";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAccessLogs";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerAccessLogsAtSummaryTransformer } from "../transformers/ShoppingMallSellerAccessLogsAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellersSellerIdAccessLogs(props: {
  admin: AdminPayload;
  sellerId: string;
  body: IShoppingMallSellerAccessLogs.IRequest;
}): Promise<IPageIShoppingMallSellerAccessLogs.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with all filters
  const whereInput: Prisma.shopping_mall_seller_access_logsWhereInput = {
    seller_id: props.sellerId,
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.success !== undefined && { success: props.body.success }),
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
  } satisfies Prisma.shopping_mall_seller_access_logsWhereInput;
  // Fetch paginated data
  const data = await MyGlobal.prisma.shopping_mall_seller_access_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy:
      props.body.sort === "-created_at"
        ? { created_at: "desc" as const }
        : { created_at: "asc" as const },
    ...ShoppingMallSellerAccessLogsAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.shopping_mall_seller_access_logs.count({
    where: whereInput,
  });
  // Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerAccessLogsAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
