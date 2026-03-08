import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemCancellationRequestTransformer } from "../transformers/EcommerceMallOrderItemCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrderItemsOrderItemIdCancellationRequestsRequestId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemCancellationRequest> {
  // Query cancellation request with order item relation for ownership verification
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findFirst(
      {
        where: {
          id: props.requestId,
          order_item_id: props.orderItemId,
          deleted_at: null,
        },
        select: {
          id: true,
          reason: true,
          status: true,
          requested_at: true,
          responded_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          orderItem: {
            select: {
              id: true,
              quantity: true,
              unit_price: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              ecommerce_mall_order_id: true,
              ecommerce_mall_product_variant_id: true,
              order: {
                select: {
                  id: true,
                  order_number: true,
                  status: true,
                  total_price: true,
                  created_at: true,
                  customer: {
                    select: {
                      email: true,
                      created_at: true,
                      id: true,
                      account_status: true,
                      display_name: true,
                      phone_number: true,
                    },
                  },
                  orderItems: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
              productVariant: {
                select: {
                  id: true,
                  sku_code: true,
                  price: true,
                  stock_quantity: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  ecommerce_mall_product_id: true,
                  variantOptions: {
                    select: {
                      key: true,
                      value: true,
                    },
                  },
                  product: {
                    select: {
                      id: true,
                      seller_id: true,
                      category_id: true,
                      name: true,
                      description: true,
                      base_price: true,
                      status: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                },
              },
            },
          },
        },
      } satisfies Prisma.ecommerce_mall_order_item_cancellation_requestsFindManyArgs,
    );
  // 404 if not found
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify seller owns the product
  if (
    cancellationRequest.orderItem.productVariant.product.seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return using transformer
  return await EcommerceMallOrderItemCancellationRequestTransformer.transform(
    cancellationRequest,
  );
}
