import { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorPromotion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceAdministratorPromotionAtSummaryTransformer } from "../transformers/EcommerceAdministratorPromotionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministrators(props: {
  body: IEcommerceAdministratorPromotion.IRequest;
}): Promise<IPageIEcommerceAdministratorPromotion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput: Prisma.ecommerce_administrator_promotionsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.request_reason && {
      request_reason: {
        contains: props.body.request_reason,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.approved_at_from && {
      approved_at: { gte: new Date(props.body.approved_at_from) },
    }),
    ...(props.body.approved_at_to && {
      approved_at: { lte: new Date(props.body.approved_at_to) },
    }),
    ...(props.body.rejected_at_from && {
      rejected_at: { gte: new Date(props.body.rejected_at_from) },
    }),
    ...(props.body.rejected_at_to && {
      rejected_at: { lte: new Date(props.body.rejected_at_to) },
    }),
  };
  // Get data with pagination
  const data =
    await MyGlobal.prisma.ecommerce_administrator_promotions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceAdministratorPromotionAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_administrator_promotions.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceAdministratorPromotionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
