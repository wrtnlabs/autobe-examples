import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderRefundRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderRefundRequestAtSummaryTransformer } from "../transformers/ShoppingMallOrderRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerRefundRequests(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallOrderRefundRequest.ISummary> {
  const limit = 100;
  const page = 1;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findMany({
      where: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallOrderRefundRequestAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_order_refund_requests.count(
    {
      where: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderRefundRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
