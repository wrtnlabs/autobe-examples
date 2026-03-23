import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductDeletion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductDeletionAtSummaryTransformer } from "../transformers/EcommerceMallProductDeletionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductDeletions(props: {
  admin: AdminPayload;
  body: IEcommerceMallProductDeletion.IRequest;
}): Promise<IPageIEcommerceMallProductDeletion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.product_id && { product_id: props.body.product_id }),
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.status && { status: props.body.status }),
  } satisfies Prisma.ecommerce_mall_product_deletionsWhereInput;
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_mall_product_deletionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_product_deletions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallProductDeletionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_product_deletions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductDeletionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
