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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSessionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSessions(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerSession.IRequest;
}): Promise<IPageIEcommerceMallSellerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sanitizedLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = limit > 100 ? 100 : limit;
  const sanitizedPage: number & tags.Type<"int32"> & tags.Minimum<1> =
    page < 1 ? 1 : page;
  const skip = (sanitizedPage - 1) * sanitizedLimit;
  const search = props.body.search;
  const dateFilter = props.body.created_at;
  const expirationFilter = props.body.expired_at;
  const whereInput: Prisma.ecommerce_mall_seller_sessionsWhereInput = {
    seller: {
      deleted_at: null,
    },
  };
  if (search) {
    if (search.ip) {
      whereInput.ip = { contains: search.ip };
    }
    if (search.href) {
      whereInput.href = { contains: search.href };
    }
    if (search.referrer) {
      whereInput.referrer = { contains: search.referrer };
    }
  }
  if (dateFilter?.gte) {
    whereInput.created_at = { gte: new Date(dateFilter.gte) };
  }
  if (expirationFilter?.gte) {
    whereInput.expired_at = { gte: new Date(expirationFilter.gte) };
  }
  const orderByInput: Prisma.ecommerce_mall_seller_sessionsOrderByWithRelationInput[] =
    props.body.sort === "last_activity"
      ? [{ expired_at: props.body.order === "asc" ? "asc" : "desc" }]
      : [{ created_at: props.body.order === "asc" ? "asc" : "desc" }];
  const data = await MyGlobal.prisma.ecommerce_mall_seller_sessions.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: sanitizedLimit,
    ...EcommerceMallSellerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_seller_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: sanitizedPage,
      limit: sanitizedLimit,
      records: total,
      pages: Math.ceil(total / sanitizedLimit),
    } satisfies IPage.IPagination,
  };
}
