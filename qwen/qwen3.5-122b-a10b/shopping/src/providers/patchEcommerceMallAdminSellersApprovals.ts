import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function patchEcommerceMallAdminSellersApprovals(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { shop_name: { contains: props.body.search } },
        { email: { contains: props.body.search } },
      ],
    }),
    ...(props.body.shop_name && {
      shop_name: { contains: props.body.shop_name },
    }),
    ...(props.body.email && {
      email: { contains: props.body.email },
    }),
    ...(props.body.approval_status !== null &&
      props.body.approval_status !== undefined && {
        approval_status: props.body.approval_status,
      }),
    ...(props.body.account_status !== null &&
      props.body.account_status !== undefined && {
        account_status: props.body.account_status,
      }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_sellers.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...EcommerceMallSellerAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.count({
      where: whereInput,
    }),
  ]);
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
  };
}
