import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallCancellationRequest.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 10;
  const skip = (page - 1) * limit;
  const whereCondition = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null as null,
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  const orderByConditions = [{ requested_at: "desc" as const }];
  const records =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByConditions,
    });
  const totalRecords =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: whereCondition,
    });
  return {
    data: records.map((record) => ({
      id: record.id,
      orderItemId: record.shopping_mall_order_item_id,
      customerId: record.shopping_mall_customer_id,
      sellerApprovalStatus: record.seller_approval_status,
      sellerRejectionReason: record.seller_approval_reason ?? null,
      requestedAt: toISOStringSafe(record.requested_at),
      respondedAt:
        record.processed_at !== null
          ? toISOStringSafe(record.processed_at)
          : null,
    })),
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  };
}
