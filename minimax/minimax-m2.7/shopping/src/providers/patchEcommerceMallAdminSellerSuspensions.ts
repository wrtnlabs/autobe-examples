import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
  // Build suspended_at date range filter
  const suspendedAtFilter: Prisma.DateTimeFilter | undefined = (() => {
    const from = props.body.suspended_at_from;
    const to = props.body.suspended_at_to;
    if (from === undefined && to === undefined) return undefined;
    return {
      ...(from !== undefined && { gte: new Date(from) }),
      ...(to !== undefined && { lte: new Date(to) }),
    };
  })();
  // Build restored_at date range filter
  const restoredAtFilter: Prisma.DateTimeFilter | undefined = (() => {
    const from = props.body.restored_at_from;
    const to = props.body.restored_at_to;
    if (from === undefined && to === undefined) return undefined;
    return {
      ...(from !== undefined && { gte: new Date(from) }),
      ...(to !== undefined && { lte: new Date(to) }),
    };
  })();
  // Build restored_at exact match filter (for null/non-null filtering)
  const restoredAtExactFilter: Prisma.DateTimeFilter | null = (() => {
    const val = props.body.restored_at;
    if (val === undefined || val === null) return null;
    return { equals: new Date(val) };
  })();
  const whereInput = {
    ...(props.body.seller_id && {
      ecommerce_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.suspended_by_id && {
      suspended_by_id: props.body.suspended_by_id,
    }),
    ...(props.body.restored_by_id && {
      restored_by_id: props.body.restored_by_id,
    }),
    ...(suspendedAtFilter && { suspended_at: suspendedAtFilter }),
    ...(restoredAtFilter && { restored_at: restoredAtFilter }),
    ...(restoredAtExactFilter !== null && {
      restored_at: restoredAtExactFilter,
    }),
    ...(props.body.restored_at === null && { restored_at: null }),
  } satisfies Prisma.ecommerce_mall_seller_suspensionsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { suspended_at: "desc" },
      ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.count({
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
      EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
    ),
  };
}
