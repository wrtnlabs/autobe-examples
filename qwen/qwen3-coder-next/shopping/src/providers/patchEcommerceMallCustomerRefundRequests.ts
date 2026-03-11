import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    customer_id: props.customer.id,
  };
  if (props.body.status) {
    where.status = props.body.status;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reason: true,
        status: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        order_item_id: true,
        customer_id: true,
        seller_id: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            product_name: true,
            variant_options: true,
            product_price: true,
            item_status: true,
            product_id: true,
            variant_id: true,
            seller_id: true,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                is_available: true,
                created_at: true,
                seller_id: true,
                seller: {
                  select: {
                    id: true,
                    shop_name: true,
                    approval_status: true,
                    is_suspended: true,
                    created_at: true,
                  },
                },
                images: {
                  select: {
                    id: true,
                    image_url: true,
                    sort_order: true,
                    is_main: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
              },
            } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
            variant: {
              select: {
                id: true,
                sku_code: true,
                price_override: true,
                stock_quantity: true,
              },
            } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                is_suspended: true,
                created_at: true,
              },
            } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        customer: {
          select: {
            id: true,
            email: true,
            created_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
            is_suspended: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_refund_requests.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      reason: record.reason,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      responded_at: record.responded_at
        ? toISOStringSafe(record.responded_at)
        : null,
      order_item: {
        id: record.orderItem.id,
        quantity: record.orderItem.quantity,
        product_name: record.orderItem.product_name,
        variant_options: record.orderItem.variant_options,
        product_price: record.orderItem.product_price,
        item_status: typia.assert<
          IEcommerceMallOrderItem.ISummary["item_status"]
        >(record.orderItem.item_status),
        product: {
          id: record.orderItem.product.id,
          name: record.orderItem.product.name,
          base_price: record.orderItem.product.base_price,
          is_available: record.orderItem.product.is_available,
          created_at: toISOStringSafe(record.orderItem.product.created_at),
          seller: {
            id: record.orderItem.product.seller.id,
            shop_name: record.orderItem.product.seller.shop_name,
            approval_status: record.orderItem.product.seller.approval_status,
            is_suspended: record.orderItem.product.seller.is_suspended,
            created_at: toISOStringSafe(
              record.orderItem.product.seller.created_at,
            ),
          },
          main_image: {
            id:
              record.orderItem.product.images.find((img) => img.is_main)?.id ||
              record.orderItem.product.images[0].id,
            image_url:
              record.orderItem.product.images.find((img) => img.is_main)
                ?.image_url || record.orderItem.product.images[0].image_url,
            sort_order:
              record.orderItem.product.images.find((img) => img.is_main)
                ?.sort_order || record.orderItem.product.images[0].sort_order,
            is_main:
              record.orderItem.product.images.find((img) => img.is_main)
                ?.is_main || record.orderItem.product.images[0].is_main,
            created_at: toISOStringSafe(
              record.orderItem.product.images.find((img) => img.is_main)
                ?.created_at || record.orderItem.product.images[0].created_at,
            ),
            updated_at: toISOStringSafe(
              record.orderItem.product.images.find((img) => img.is_main)
                ?.updated_at || record.orderItem.product.images[0].updated_at,
            ),
            deleted_at:
              record.orderItem.product.images
                .find((img) => img.is_main)
                ?.deleted_at?.toISOString() ??
              record.orderItem.product.images[0].deleted_at?.toISOString() ??
              null,
          },
        },
        variant: {
          id: record.orderItem.variant.id,
          sku_code: record.orderItem.variant.sku_code,
          price_override: record.orderItem.variant.price_override,
          stock_quantity: record.orderItem.variant.stock_quantity,
        },
        seller: {
          id: record.orderItem.seller.id,
          shop_name: record.orderItem.seller.shop_name,
          approval_status: record.orderItem.seller.approval_status,
          is_suspended: record.orderItem.seller.is_suspended,
          created_at: toISOStringSafe(record.orderItem.seller.created_at),
        },
      },
      customer: {
        id: record.customer.id,
        email: record.customer.email,
        is_suspended: record.customer.deleted_at !== null,
        created_at: toISOStringSafe(record.customer.created_at),
      },
      seller: {
        id: record.seller.id,
        shop_name: record.seller.shop_name,
        approval_status: record.seller.approval_status,
        is_suspended: record.seller.is_suspended,
        created_at: toISOStringSafe(record.seller.created_at),
      },
    })),
  };
}
