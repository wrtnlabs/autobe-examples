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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    customer_id: props.customer.id,
    ...(props.body.status !== undefined && { status: props.body.status }),
  } satisfies Prisma.shopping_mall_cancellation_requestsWhereInput;
  const requests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reason: true,
        status: true,
        seller_response: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: {
            product_name: true,
            variant_sku_code: true,
            quantity: true,
            order: {
              select: {
                order_number: true,
              },
            },
          },
        },
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_cancellation_requests.count(
    {
      where: whereInput,
    },
  );
  const data: IShoppingMallCancellationRequest.ISummary[] = requests.map(
    (r) => ({
      id: r.id,
      orderNumber: r.orderItem.order.order_number,
      productName: r.orderItem.product_name,
      variantSku: r.orderItem.variant_sku_code,
      quantity: r.orderItem.quantity,
      reason: r.reason,
      status: r.status,
      sellerResponse: r.seller_response,
      rejectionReason: r.rejection_reason,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
