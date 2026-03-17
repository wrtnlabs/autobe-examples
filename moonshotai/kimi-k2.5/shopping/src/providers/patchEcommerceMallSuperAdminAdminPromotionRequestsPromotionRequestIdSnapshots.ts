import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestSnapshotTransformer } from "../transformers/EcommerceMallAdminPromotionRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminPromotionRequestsPromotionRequestIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  promotionRequestId: string;
  body: IEcommerceMallAdminPromotionRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequestSnapshot> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    admin_promotion_request_id: props.promotionRequestId,
    ...(props.body.previousStatus !== undefined && {
      previous_status: props.body.previousStatus,
    }),
    ...(props.body.newStatus !== undefined && {
      new_status: props.body.newStatus,
    }),
    ...(props.body.previousReviewerId !== undefined && {
      previous_reviewer_id: props.body.previousReviewerId,
    }),
    ...(props.body.newReviewerId !== undefined && {
      new_reviewer_id: props.body.newReviewerId,
    }),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_admin_promotion_request_snapshotsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      ...EcommerceMallAdminPromotionRequestSnapshotTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdminPromotionRequestSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
