import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  // Pagination parameters with defaults and constraints
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause for refund requests
  const whereInput = (() => {
    const base: Prisma.ecommerce_mall_refund_requestsWhereInput = {
      deleted_at: null,
      ecommerce_mall_seller_id: props.seller.id,
    };
    if (props.body.status !== undefined) {
      base.status = props.body.status;
    }
    if (props.body.customer_id !== undefined) {
      base.ecommerce_mall_customer_id = props.body.customer_id;
    }
    if (props.body.order_item_id !== undefined) {
      base.ecommerce_mall_order_item_id = props.body.order_item_id;
    }
    if (props.body.reason_keyword !== undefined) {
      base.reason = {
        contains: props.body.reason_keyword,
        mode: "insensitive",
      };
    }
    if (
      props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined
    ) {
      base.created_at = {};
      if (props.body.created_at_from !== undefined) {
        base.created_at.gte = new Date(props.body.created_at_from);
      }
      if (props.body.created_at_to !== undefined) {
        base.created_at.lte = new Date(props.body.created_at_to);
      }
    }
    return base satisfies Prisma.ecommerce_mall_refund_requestsWhereInput;
  })();
  // Query refund requests with pagination
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  // Transform results using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: transformedData,
  };
}
