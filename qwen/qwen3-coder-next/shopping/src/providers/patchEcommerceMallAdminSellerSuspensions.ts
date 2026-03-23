import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSuspensionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellerSuspensions(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerSuspension.IRequest;
}): Promise<IPageIEcommerceMallSellerSuspension.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_seller_suspensionsWhereInput = {
    deleted_at: null,
    ...(props.body.seller_id && { seller_id: props.body.seller_id }),
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.status === "active" && { reinstated_at: null }),
    ...(props.body.status === "reinstated" && { reinstated_at: { not: null } }),
    ...(props.body.created_at_range && {
      created_at: {
        gte: props.body.created_at_range[0],
        lte: props.body.created_at_range[1],
      },
    }),
  } satisfies Prisma.ecommerce_mall_seller_suspensionsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
