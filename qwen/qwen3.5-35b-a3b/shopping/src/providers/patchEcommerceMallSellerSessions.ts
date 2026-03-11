import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerSessionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSessions(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerSession.IRequest;
}): Promise<IPageIEcommerceMallSellerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build search filter
  const searchFilter: Prisma.ecommerce_mall_seller_sessionsWhereInput = {
    ...(props.body.search?.ip && { ip: { contains: props.body.search.ip } }),
    ...(props.body.search?.href && {
      href: { contains: props.body.search.href },
    }),
    ...(props.body.search?.referrer && {
      referrer: { contains: props.body.search.referrer },
    }),
  };
  // Build date filters
  const dateFilter: Prisma.ecommerce_mall_seller_sessionsWhereInput = {
    ...(props.body.created_at?.gte && {
      created_at: { gte: new Date(props.body.created_at.gte) },
    }),
    ...(props.body.expired_at?.gte && {
      expired_at: { gte: new Date(props.body.expired_at.gte) },
    }),
  };
  // Build where clause - must filter by seller_id for authorization
  const whereInput: Prisma.ecommerce_mall_seller_sessionsWhereInput = {
    seller_id: props.seller.id,
    ...searchFilter,
    ...dateFilter,
  };
  // Build order by - normalize sort field, always use created_at
  const orderByInput =
    props.body.sort === "last_activity"
      ? { created_at: (props.body.order ?? "desc") as "asc" | "desc" }
      : { created_at: (props.body.order ?? "desc") as "asc" | "desc" };
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_seller_sessions.count({
    where: whereInput,
  });
  // Get paginated data
  const data = await MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallSellerSessionAtSummaryTransformer.select(),
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallSellerSessionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
