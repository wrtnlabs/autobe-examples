import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
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

export async function patchEcommerceMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
    deleted_at: null,
    customer_id: props.customer.id,
  };
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (props.body.seller_id !== undefined) {
    where.seller_id = props.body.seller_id;
  }
  if (props.body.order_item_id !== undefined) {
    where.order_item_id = props.body.order_item_id;
  }
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        customer: {
          select: { id: true, email: true, created_at: true, deleted_at: true },
        },
        orderItem: {
          select: {
            id: true,
            quantity: true,
            product_name: true,
            variant_options: true,
            product_price: true,
            item_status: true,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                is_available: true,
                created_at: true,
                seller_id: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku_code: true,
                price_override: true,
                stock_quantity: true,
              },
            },
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                is_suspended: true,
                created_at: true,
              },
            },
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({ where });
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      order_item_id: item.order_item_id as string & tags.Format<"uuid">,
      status: item.status,
      customer: {
        id: item.customer.id as string & tags.Format<"uuid">,
        email: item.customer.email,
        is_suspended: item.customer.deleted_at !== null,
        created_at: toISOStringSafe(item.customer.created_at),
      },
      order_item: {
        id: item.orderItem.id as string & tags.Format<"uuid">,
        quantity: item.orderItem.quantity,
        product_name: item.orderItem.product_name,
        variant_options: item.orderItem.variant_options,
        product_price: item.orderItem.product_price,
        item_status: item.orderItem
          .item_status as IEcommerceMallOrderItem.ISummary["item_status"],
        product: {
          id: item.orderItem.product.id as string & tags.Format<"uuid">,
          name: item.orderItem.product.name,
          base_price: item.orderItem.product.base_price,
          is_available: item.orderItem.product.is_available,
          created_at: toISOStringSafe(item.orderItem.product.created_at),
          seller: {
            id: item.orderItem.seller.id as string & tags.Format<"uuid">,
            shop_name: item.orderItem.seller.shop_name,
            approval_status: item.orderItem.seller.approval_status,
            is_suspended: item.orderItem.seller.is_suspended,
            created_at: toISOStringSafe(item.orderItem.seller.created_at),
          },
          main_image: null as any,
        },
        variant: {
          id: item.orderItem.variant.id as string & tags.Format<"uuid">,
          sku_code: item.orderItem.variant.sku_code,
          price_override: item.orderItem.variant.price_override,
          stock_quantity: item.orderItem.variant.stock_quantity,
        },
        seller: {
          id: item.orderItem.seller.id as string & tags.Format<"uuid">,
          shop_name: item.orderItem.seller.shop_name,
          approval_status: item.orderItem.seller.approval_status,
          is_suspended: item.orderItem.seller.is_suspended,
          created_at: toISOStringSafe(item.orderItem.seller.created_at),
        },
      },
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
