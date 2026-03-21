import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build date range condition separately to avoid duplicate keys
  const createdAtCondition = (() => {
    const conditions: Record<string, unknown>[] = [];
    if (props.body.created_at_from !== undefined) {
      conditions.push({ gte: new Date(props.body.created_at_from) });
    }
    if (props.body.created_at_to !== undefined) {
      conditions.push({ lte: new Date(props.body.created_at_to) });
    }
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { AND: conditions };
  })();
  const whereInput = {
    deleted_at: null,
    ecommerce_mall_customer_id: props.customer.id,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.seller_id !== undefined && {
      ecommerce_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.order_item_id !== undefined && {
      ecommerce_mall_order_item_id: props.body.order_item_id,
    }),
    ...(createdAtCondition !== undefined && { created_at: createdAtCondition }),
    ...(props.body.reason_keyword !== undefined && {
      reason: { contains: props.body.reason_keyword },
    }),
  } satisfies Prisma.ecommerce_mall_refund_requestsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: EcommerceMallRefundRequestTransformer.select().select,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallRefundRequestTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
