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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSales(props: {
  seller: SellerPayload;
  body: IShoppingMallSale.IRequest;
}): Promise<IPageIShoppingMallSale.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: Record<string, unknown> = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
  };

  // Apply search filter
  if (props.body.search) {
    whereConditions.OR = [
      { order: { order_number: { contains: props.body.search } } },
      { customer: { first_name: { contains: props.body.search } } },
      { customer: { last_name: { contains: props.body.search } } },
    ];
  }

  // Apply sale status filter
  if (props.body.sale_status) {
    whereConditions.sale_status = props.body.sale_status;
  }

  // Apply amount range filters
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

  // Apply commission rate filters
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

  // Apply net amount filters
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

  // Apply date range filters
  if (props.body.start_date || props.body.end_date) {
    whereConditions.sale_date = {};
    if (props.body.start_date) {
      (whereConditions.sale_date as Record<string, unknown>).gte = new Date(
        props.body.start_date,
      );
    }
    if (props.body.end_date) {
      (whereConditions.sale_date as Record<string, unknown>).lte = new Date(
        props.body.end_date,
      );
    }
  }

  // Build order by
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (props.body.order_by) {
    const fieldMap: Record<string, string> = {
      sale_date: "sale_date",
      sale_amount: "sale_amount",
      item_count: "item_count",
      commission_rate: "commission_rate",
      net_amount: "net_amount",
    };
    orderBy[fieldMap[props.body.order_by]] =
      props.body.order_direction ?? "asc";
  } else {
    orderBy.sale_date = "desc";
  }

  // Execute queries concurrently
  const [sales, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sales.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: true,
        seller: true,
        order: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sales.count({
      where: whereConditions,
    }),
  ]);

  // Map to response DTO
  const data = sales.map((sale) => ({
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
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
