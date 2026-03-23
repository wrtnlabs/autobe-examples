import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderOverride";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderOverride";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrderOverrides(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrderOverride.IRequest;
}): Promise<IPageIEcommerceMallOrderOverride.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_order_overridesWhereInput = {
    deleted_at: null,
    ...(props.body.actionType && { action_type: props.body.actionType }),
    ...(props.body.customerId && { customer_id: props.body.customerId }),
    ...(props.body.sellerId && { seller_id: props.body.sellerId }),
    ...(props.body.orderId && { order_id: props.body.orderId }),
    ...(props.body.orderItemId && { order_item_id: props.body.orderItemId }),
  };
  const data = await MyGlobal.prisma.ecommerce_mall_order_overrides.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      adminUser: {
        select: { id: true, email: true, grade: true, created_at: true },
      },
      customer: { select: { id: true, email: true } },
      orderItem: {
        select: {
          id: true,
          product_name: true,
          variant_options: true,
          quantity: true,
        },
      },
      order: { select: { id: true, total_price: true } },
      seller: { select: { id: true, shop_name: true, approval_status: true } },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_overrides.count({
    where,
  });
  return {
    data: data.map((override) => ({
      id: override.id,
      action_type: override.action_type as "cancel" | "refund",
      reason: override.reason,
      admin_user: {
        id: override.adminUser.id,
        email: override.adminUser.email,
        grade: override.adminUser.grade as "regular" | "super",
        created_at: toISOStringSafe(override.adminUser.created_at),
      },
      customer: {
        id: override.customer.id,
        email: override.customer.email,
        is_suspended: false,
        created_at: toISOStringSafe(override.adminUser.created_at),
      },
      order_item: {
        id: override.orderItem.id,
        quantity: override.orderItem.quantity,
        product_name: override.orderItem.product_name,
        variant_options: override.orderItem.variant_options,
        product_price: 0,
        item_status: "paid",
        product: {
          id: "",
          name: override.orderItem.product_name,
          base_price: 0,
          is_available: true,
          created_at: toISOStringSafe(new Date()),
          seller: {
            id: override.seller.id,
            shop_name: override.seller.shop_name,
            approval_status: override.seller.approval_status,
            is_suspended: false,
            created_at: toISOStringSafe(new Date()),
          },
          main_image: {
            id: "",
            image_url: "",
            sort_order: 0,
            is_main: true,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
          },
        },
        variant: {
          id: "",
          sku_code: "",
          price_override: null,
          stock_quantity: 0,
        },
        seller: {
          id: override.seller.id,
          shop_name: override.seller.shop_name,
          approval_status: override.seller.approval_status,
          is_suspended: false,
          created_at: toISOStringSafe(new Date()),
        },
      },
      order: {
        id: override.order.id,
        total_price: override.order.total_price,
        order_status: "paid",
        customer: {
          id: override.customer.id,
          email: override.customer.email,
          is_suspended: false,
          created_at: toISOStringSafe(override.adminUser.created_at),
        },
        shipping_address: {
          id: "",
          recipient_name: "",
          street_address: "",
          city: "",
          state_province: "",
          postal_code: "",
          country: "",
          is_default: false,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
      seller: {
        id: override.seller.id,
        shop_name: override.seller.shop_name,
        approval_status: override.seller.approval_status,
        is_suspended: false,
        created_at: toISOStringSafe(new Date()),
      },
      created_at: toISOStringSafe(override.created_at),
      updated_at: toISOStringSafe(override.updated_at),
      deleted_at: override.deleted_at
        ? toISOStringSafe(override.deleted_at)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
