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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdministratorPromotionAtSummaryTransformer } from "../transformers/EcommerceAdministratorPromotionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAdministratorPromotions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceAdministratorPromotion.IRequest;
}): Promise<IPageIEcommerceAdministratorPromotion.ISummary> {
  // Handle pagination with bounds
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper typed conditions
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_at_from && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: props.body.created_at_to },
    }),
    ...(props.body.approved_at_from && {
      approved_at: { gte: props.body.approved_at_from },
    }),
    ...(props.body.approved_at_to && {
      approved_at: { lte: props.body.approved_at_to },
    }),
    ...(props.body.rejected_at_from && {
      rejected_at: { gte: props.body.rejected_at_from },
    }),
    ...(props.body.rejected_at_to && {
      rejected_at: { lte: props.body.rejected_at_to },
    }),
    ...(props.body.request_reason && {
      request_reason: {
        contains: props.body.request_reason,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.ecommerce_administrator_promotionsWhereInput;
  // Execute queries sequentially
  const data =
    await MyGlobal.prisma.ecommerce_administrator_promotions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceAdministratorPromotionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_administrator_promotions.count({
    where: whereInput,
  });
  // Transform results using the available transformer
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
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceAdministratorPromotion.ISummary;
}
