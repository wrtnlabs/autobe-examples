import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
import { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdministratorAdminPromotionRequestsRequestIdSnapshots(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPromotionRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallAdminPromotionRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const whereInput = {
    shopping_mall_admin_promotion_request_id: props.requestId,
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.shopping_mall_admin_promotion_request_snapshotsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_promotion_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        [sort]: direction,
      } as Prisma.shopping_mall_admin_promotion_request_snapshotsOrderByWithRelationInput,
      ...ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_admin_promotion_request_snapshots.count({
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
      ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer.transform,
    ),
  };
}
