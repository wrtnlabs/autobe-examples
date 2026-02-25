import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
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
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallOrderCancellationRequestAtSummaryTransformer } from "../transformers/ShoppingMallOrderCancellationRequestAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerCancellationRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderCancellationRequest.IRequest;
}): Promise<IPageIShoppingMallOrderCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where condition for filtering
  const where: Prisma.shopping_mall_order_cancellation_requestsWhereInput = {
    deleted_at: null,
  };
  // Build orderItem filter if needed
  const orderItemFilters: Prisma.shopping_mall_order_itemsWhereInput[] = [];
  // Filter by seller's products through order items
  orderItemFilters.push({
    productSnapshot: {
      product: {
        shopping_mall_seller_id: props.seller.id,
      },
    },
  });
  // Seller ID filter (additional constraint)
  if (props.body.seller_id) {
    orderItemFilters.push({
      productSnapshot: {
        product: {
          shopping_mall_seller_id: props.body.seller_id,
        },
      },
    });
  }
  // Only add orderItem filter if we have filters
  if (orderItemFilters.length > 0) {
    where.orderItem = {
      order: {
        orderItems: {
          some: {
            AND: orderItemFilters,
          },
        },
      },
    };
  }
  // Order ID filter (separate condition)
  if (props.body.order_id) {
    if (!where.orderItem) {
      where.orderItem = {};
    }
    where.orderItem.shopping_mall_order_id = props.body.order_id;
  }
  // Customer ID filter
  if (props.body.customer_id) {
    where.customer_id = props.body.customer_id;
  }
  // Date range filters
  if (props.body.created_at_gte || props.body.created_at_lte) {
    const dateFilter: Prisma.DateTimeFilter<"shopping_mall_order_cancellation_requests"> =
      {};
    if (props.body.created_at_gte) {
      dateFilter.gte = toISOStringSafe(new Date(props.body.created_at_gte));
    }
    if (props.body.created_at_lte) {
      dateFilter.lte = toISOStringSafe(new Date(props.body.created_at_lte));
    }
    where.created_at = dateFilter;
  }
  // Status filter
  if (props.body.status) {
    where.status = props.body.status;
  }
  // Search filter
  if (props.body.search) {
    where.OR = [
      {
        orderItem: {
          order: {
            id: props.body.search,
          },
        },
      },
      {
        orderItem: {
          original_product_name: { contains: props.body.search },
        },
      },
      {
        customer: {
          display_name: { contains: props.body.search },
        },
      },
    ];
  }
  // Execute count query for pagination
  const total =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.count({
      where,
    });
  // Execute data query
  const data =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
            created_at: true,
          },
        },
        logs: {
          select: {
            id: true,
          },
        },
      },
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallOrderCancellationRequestAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
