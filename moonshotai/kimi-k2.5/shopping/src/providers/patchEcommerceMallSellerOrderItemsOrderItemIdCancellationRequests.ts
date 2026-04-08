import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrderItemsOrderItemIdCancellationRequests(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  // Verify order item exists and belongs to seller
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: {
        id: props.orderItemId,
      },
      select: {
        id: true,
        seller_id: true,
        deleted_at: true,
      },
    },
  );
  if (!orderItem || orderItem.deleted_at !== null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with filters
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.createdAtFrom) {
    createdAtFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo) {
    createdAtFilter.lte = new Date(props.body.createdAtTo);
  }
  const respondedAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.respondedAtFrom) {
    respondedAtFilter.gte = new Date(props.body.respondedAtFrom);
  }
  if (props.body.respondedAtTo) {
    respondedAtFilter.lte = new Date(props.body.respondedAtTo);
  }
  const where = {
    order_item_id: props.orderItemId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(Object.keys(respondedAtFilter).length > 0 && {
      responded_at: respondedAtFilter,
    }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_requestsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Sorting
  const sortFieldMap: Record<
    string,
    keyof Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput
  > = {
    createdAt: "created_at",
    updatedAt: "updated_at",
    status: "status",
  };
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy = {
    [sortFieldMap[sortBy] ?? "created_at"]: sortOrder,
  } satisfies Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput;
  // Query cancellation requests
  const cancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({ where });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    cancellationRequests,
    EcommerceMallCancellationRequestAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
