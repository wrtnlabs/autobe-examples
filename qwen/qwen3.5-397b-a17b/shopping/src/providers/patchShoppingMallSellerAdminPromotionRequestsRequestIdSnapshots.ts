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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerAdminPromotionRequestsRequestIdSnapshots(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPromotionRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallAdminPromotionRequestSnapshot.ISummary> {
  const sellerRequest =
    await MyGlobal.prisma.shopping_mall_admin_promotion_request_of_sellers.findUnique(
      {
        where: { shopping_mall_admin_promotion_request_id: props.requestId },
        select: {
          shopping_mall_admin_promotion_request_id: true,
          shopping_mall_seller_id: true,
        },
      },
    );
  if (
    !sellerRequest ||
    sellerRequest.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
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
    shopping_mall_admin_promotion_request_id: props.requestId,
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.status && { status: props.body.status }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.shopping_mall_admin_promotion_request_snapshotsWhereInput;
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.shopping_mall_admin_promotion_request_snapshotsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.shopping_mall_admin_promotion_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_admin_promotion_request_snapshots.count(
      {
        where: whereInput,
      },
    );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
