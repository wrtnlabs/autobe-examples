import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminPromotions(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdminPromotion.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filter properly
  const createdAtFrom =
    props.body.created_at_from !== undefined
      ? new Date(props.body.created_at_from)
      : undefined;
  const createdAtTo =
    props.body.created_at_to !== undefined
      ? new Date(props.body.created_at_to)
      : undefined;
  const whereInput = {
    ...(props.body.admin_id !== undefined && {
      admin_id: props.body.admin_id,
    }),
    ...(props.body.performed_by_super_admin_id !== undefined && {
      performed_by_super_admin_id: props.body.performed_by_super_admin_id,
    }),
    ...(props.body.action !== undefined && {
      action: props.body.action,
    }),
    ...(createdAtFrom !== undefined || createdAtTo !== undefined
      ? {
          created_at: {
            ...(createdAtFrom !== undefined && { gte: createdAtFrom }),
            ...(createdAtTo !== undefined && { lte: createdAtTo }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_admin_promotionsWhereInput;
  const orderByInput = (
    props.body.sort === "created_at" && props.body.order === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_admin_promotionsOrderByWithRelationInput;
  const promotions =
    await MyGlobal.prisma.ecommerce_mall_admin_promotions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallAdminPromotionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_admin_promotions.count({
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
      promotions,
      EcommerceMallAdminPromotionAtSummaryTransformer.transform,
    ),
  };
}
