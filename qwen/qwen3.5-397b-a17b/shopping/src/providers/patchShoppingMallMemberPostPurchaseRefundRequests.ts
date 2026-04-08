import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallPostPurchaseRefundRequestAtSummaryTransformer } from "../transformers/ShoppingMallPostPurchaseRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberPostPurchaseRefundRequests(props: {
  member: MemberPayload;
  body: IShoppingMallPostPurchaseRefundRequest.IRequest;
}): Promise<IPageIShoppingMallPostPurchaseRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_post_purchase_refund_requestsWhereInput =
    {
      deleted_at: null,
      shopping_mall_member_id: props.member.id,
      ...(props.body.status !== undefined && {
        status: Array.isArray(props.body.status)
          ? { in: props.body.status }
          : props.body.status,
      }),
      ...(props.body.created_at !== undefined && {
        created_at: {
          ...(props.body.created_at.gte !== undefined && {
            gte: props.body.created_at.gte,
          }),
          ...(props.body.created_at.lte !== undefined && {
            lte: props.body.created_at.lte,
          }),
        },
      }),
      ...(props.body.shopping_mall_order_item_id !== undefined && {
        shopping_mall_order_item_id: props.body.shopping_mall_order_item_id,
      }),
    } satisfies Prisma.shopping_mall_post_purchase_refund_requestsWhereInput;
  const records =
    await MyGlobal.prisma.shopping_mall_post_purchase_refund_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallPostPurchaseRefundRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_post_purchase_refund_requests.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallPostPurchaseRefundRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallPostPurchaseRefundRequest.ISummary;
}
