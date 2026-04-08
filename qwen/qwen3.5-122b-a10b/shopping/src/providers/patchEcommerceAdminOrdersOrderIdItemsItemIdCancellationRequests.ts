import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminOrdersOrderIdItemsItemIdCancellationRequests(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IRequest;
}): Promise<IPageIEcommerceCancellationRequest.ISummary> {
  // Verify order item exists and belongs to the specified order
  await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
    },
    select: { id: true },
  });
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for cancellation requests
  const whereInput = {
    ecommerce_order_item_id: props.itemId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
  } satisfies Prisma.ecommerce_cancellation_requestsWhereInput;
  // Fetch paginated records with transformer select
  const records =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      ...EcommerceCancellationRequestAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_cancellation_requests.count({
    where: whereInput,
  });
  // Transform and return results
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceCancellationRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceCancellationRequest.ISummary;
}
