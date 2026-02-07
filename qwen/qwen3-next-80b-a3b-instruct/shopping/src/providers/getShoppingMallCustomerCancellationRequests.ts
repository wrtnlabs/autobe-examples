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

export async function getShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  page?: number;
  limit?: number;
}): Promise<IPageIShoppingMallCancellationRequest> {
  const page = props.page ?? 1;
  const limit = props.limit ?? 10;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        customer_id: props.customer.id,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        order_item_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        auto_approve_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where: {
        customer_id: props.customer.id,
      },
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id,
      order_item_id: item.order_item_id,
      reason: item.reason,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      auto_approve_at: toISOStringSafe(item.auto_approve_at),
    })),
  };
}
