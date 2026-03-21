import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.created_at_from) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      email: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.approval_status && {
      approval_status:
        typeof props.body.approval_status === "string"
          ? props.body.approval_status
          : { in: props.body.approval_status },
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(props.body.sellerName && {
      profile: {
        name: { contains: props.body.sellerName, mode: "insensitive" as const },
      },
    }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallSeller.ISummary;
}
