import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSales(props: {
  admin: AdminPayload;
  body: IShoppingMallSale.IRequest;
}): Promise<IPageIShoppingMallSale.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // Text search
  if (props.body.search) {
    whereConditions.OR = [
      { order: { order_number: { contains: props.body.search } } },
      { customer: { first_name: { contains: props.body.search } } },
      { customer: { last_name: { contains: props.body.search } } },
    ];
  }

  // Sale status filter
  if (props.body.sale_status) {
    whereConditions.sale_status = props.body.sale_status;
  }

  // Amount range filters
  if (
    props.body.min_amount !== undefined ||
    props.body.max_amount !== undefined
  ) {
    whereConditions.sale_amount = {};
    if (props.body.min_amount !== undefined) {
      (whereConditions.sale_amount as Record<string, unknown>).gte =
        props.body.min_amount;
    }
    if (props.body.max_amount !== undefined) {
      (whereConditions.sale_amount as Record<string, unknown>).lte =
        props.body.max_amount;
    }
  }

  // Commission rate filters
  if (
    props.body.min_commission_rate !== undefined ||
    props.body.max_commission_rate !== undefined
  ) {
    whereConditions.commission_rate = {};
    if (props.body.min_commission_rate !== undefined) {
      (whereConditions.commission_rate as Record<string, unknown>).gte =
        props.body.min_commission_rate;
    }
    if (props.body.max_commission_rate !== undefined) {
      (whereConditions.commission_rate as Record<string, unknown>).lte =
        props.body.max_commission_rate;
    }
  }

  // Net amount filters
  if (
    props.body.min_net_amount !== undefined ||
    props.body.max_net_amount !== undefined
  ) {
    whereConditions.net_amount = {};
    if (props.body.min_net_amount !== undefined) {
      (whereConditions.net_amount as Record<string, unknown>).gte =
        props.body.min_net_amount;
    }
    if (props.body.max_net_amount !== undefined) {
      (whereConditions.net_amount as Record<string, unknown>).lte =
        props.body.max_net_amount;
    }
  }

  // Date range filters
  if (props.body.start_date || props.body.end_date) {
    whereConditions.sale_date = {};
    if (props.body.start_date) {
      (whereConditions.sale_date as Record<string, unknown>).gte =
        props.body.start_date;
    }
    if (props.body.end_date) {
      (whereConditions.sale_date as Record<string, unknown>).lte =
        props.body.end_date;
    }
  }

  // Build ORDER BY
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (props.body.order_by) {
    const direction = props.body.order_direction === "desc" ? "desc" : "asc";
    switch (props.body.order_by) {
      case "sale_date":
        orderBy.sale_date = direction;
        break;
      case "sale_amount":
        orderBy.sale_amount = direction;
        break;
      case "item_count":
        orderBy.item_count = direction;
        break;
      case "commission_rate":
        orderBy.commission_rate = direction;
        break;
      case "net_amount":
        orderBy.net_amount = direction;
        break;
    }
  } else {
    orderBy.created_at = "desc";
  }

  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sales.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
        seller: {
          select: {
            id: true,
            business_name: true,
            contact_person: true,
            email: true,
            status: true,
          },
        },
        order: {
          select: {
            id: true,
            order_number: true,
            total_amount: true,
            subtotal_amount: true,
            tax_amount: true,
            shipping_amount: true,
            currency: true,
            status: true,
            shipping_address: true,
            billing_address: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_sales.count({
      where: whereConditions,
    }),
  ]);

  // Transform results
  const sales = data.map((sale) => ({
    id: sale.id,
    sale_amount: sale.sale_amount,
    sale_date: toISOStringSafe(sale.sale_date),
    item_count: sale.item_count,
    sale_status: sale.sale_status,
    commission_rate: sale.commission_rate,
    net_amount: sale.net_amount,
    customer: {
      id: sale.customer.id,
      email: sale.customer.email,
      first_name: sale.customer.first_name,
      last_name: sale.customer.last_name,
      phone_number: sale.customer.phone_number ?? undefined,
      status: sale.customer.status,
      created_at: toISOStringSafe(sale.customer.created_at),
      updated_at: sale.customer.updated_at
        ? toISOStringSafe(sale.customer.updated_at)
        : undefined,
    },
    seller: {
      id: sale.seller.id,
      business_name: sale.seller.business_name,
      contact_person: sale.seller.contact_person,
      email: sale.seller.email,
      status: sale.seller.status,
    },
    order: {
      id: sale.order.id,
      order_number: sale.order.order_number,
      total_amount: sale.order.total_amount,
      subtotal_amount: sale.order.subtotal_amount,
      tax_amount: sale.order.tax_amount,
      shipping_amount: sale.order.shipping_amount,
      currency: sale.order.currency,
      status: sale.order.status,
      shipping_address: sale.order.shipping_address,
      billing_address: sale.order.billing_address,
      created_at: toISOStringSafe(sale.order.created_at),
      updated_at: toISOStringSafe(sale.order.updated_at),
      customer: {
        id: sale.customer.id,
        email: sale.customer.email,
        first_name: sale.customer.first_name,
        last_name: sale.customer.last_name,
        phone_number: sale.customer.phone_number ?? undefined,
        status: sale.customer.status,
        created_at: toISOStringSafe(sale.customer.created_at),
        updated_at: sale.customer.updated_at
          ? toISOStringSafe(sale.customer.updated_at)
          : undefined,
      },
    },
  }));

  return {
    data: sales,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
