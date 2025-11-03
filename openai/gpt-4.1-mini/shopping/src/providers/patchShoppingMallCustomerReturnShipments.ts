import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import { IPageIShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReturnShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerReturnShipments(props: {
  customer: CustomerPayload;
  body: IShoppingMallReturnShipment.IRequest;
}): Promise<IPageIShoppingMallReturnShipment.ISummary> {
  const { customer, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const defaultSortField = "created_at";
  const defaultSortOrder: "asc" | "desc" = "desc";
  const sortFieldCandidates = ["created_at", "updated_at"] as const;

  let sortField = defaultSortField;
  let sortOrder: "asc" | "desc" = defaultSortOrder;

  if (body.sorting) {
    const sorting = body.sorting.trim();
    const firstChar = sorting.charAt(0);
    if (firstChar === "-" || firstChar === "+") {
      sortOrder = firstChar === "+" ? "asc" : "desc";
      const candidate = sorting.slice(1);
      if (
        sortFieldCandidates.includes(
          candidate as (typeof sortFieldCandidates)[number],
        )
      ) {
        sortField = candidate as (typeof sortFieldCandidates)[number];
      }
    } else if (
      sortFieldCandidates.includes(
        sorting as (typeof sortFieldCandidates)[number],
      )
    ) {
      sortField = sorting as (typeof sortFieldCandidates)[number];
      sortOrder = "asc";
    }
  }

  const where: {
    shopping_mall_customer_id: string & tags.Format<"uuid">;
    return_status?: string;
    carrier_name?: { contains: string };
    tracking_number?: { contains: string };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    shopping_mall_customer_id: customer.id,
  };

  if (body.status !== undefined) {
    where.return_status = body.status;
  }
  if (body.carrier_name !== undefined) {
    where.carrier_name = { contains: body.carrier_name };
  }
  if (body.tracking_number !== undefined) {
    where.tracking_number = { contains: body.tracking_number };
  }
  if (body.date_from !== undefined || body.date_to !== undefined) {
    where.created_at = {};
    if (body.date_from !== undefined) where.created_at.gte = body.date_from;
    if (body.date_to !== undefined) where.created_at.lte = body.date_to;
  }

  const [dataRecords, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_return_shipments.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_return_shipments.count({ where }),
  ]);

  const data = dataRecords.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    shopping_mall_refund_request_id:
      record.shopping_mall_refund_request_id as string & tags.Format<"uuid">,
    shopping_mall_customer_id: record.shopping_mall_customer_id as string &
      tags.Format<"uuid">,
    carrier_name: record.carrier_name,
    tracking_number: record.tracking_number,
    return_status: record.return_status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
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
