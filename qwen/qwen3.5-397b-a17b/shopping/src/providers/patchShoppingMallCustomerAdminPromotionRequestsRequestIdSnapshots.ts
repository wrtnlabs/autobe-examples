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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerAdminPromotionRequestsRequestIdSnapshots(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPromotionRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallAdminPromotionRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: { id: true, actor_type: true },
      },
    );
  if (request.actor_type === "customer") {
    const customerRequest =
      await MyGlobal.prisma.shopping_mall_admin_promotion_request_of_customers.findUnique(
        {
          where: { shopping_mall_admin_promotion_request_id: props.requestId },
          select: { shopping_mall_customer_id: true },
        },
      );
    if (
      !customerRequest ||
      customerRequest.shopping_mall_customer_id !== props.customer.id
    ) {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput = {
    shopping_mall_admin_promotion_request_id: props.requestId,
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.status && { status: props.body.status }),
    ...((props.body.created_at_from || props.body.created_at_to) && {
      created_at: {
        ...(props.body.created_at_from && {
          gte: new Date(props.body.created_at_from),
        }),
        ...(props.body.created_at_to && {
          lte: new Date(props.body.created_at_to),
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_admin_promotion_request_snapshotsWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: sortDirection,
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
