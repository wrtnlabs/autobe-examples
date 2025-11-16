import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerInquiry";
import { IPageIShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerInquiry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomerInquiries(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerInquiry.IRequest;
}): Promise<IPageIShoppingMallCustomerInquiry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_customer_inquiriesWhereInput = {
    deleted_at: null,
  };

  if (props.body.status !== undefined) {
    where.status =
      typeof props.body.status === "string" ? props.body.status : undefined;
  }

  if (
    props.body.start_date !== undefined ||
    props.body.end_date !== undefined
  ) {
    where.created_at = {};
    if (props.body.start_date !== undefined && props.body.start_date !== null) {
      where.created_at.gte = toISOStringSafe(props.body.start_date);
    }
    if (props.body.end_date !== undefined && props.body.end_date !== null) {
      where.created_at.lte = toISOStringSafe(props.body.end_date);
    }
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customer_inquiries.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_customer_inquiries.count({ where }),
  ]);

  return {
    data: records.map((record) => ({
      id: record.id,
      title: record.title,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
