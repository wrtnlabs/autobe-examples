import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";
import { IPageIShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInquiry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminInquiries(props: {
  admin: AdminPayload;
  body: IShoppingMallInquiry.IRequest;
}): Promise<IPageIShoppingMallInquiry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build WHERE conditions using functional approach
  const buildWhereConditions = (): Prisma.shopping_mall_inquiriesWhereInput => {
    const conditions: Prisma.shopping_mall_inquiriesWhereInput = {
      deleted_at: null,
    };

    // Text search on title and body
    if (props.body.search) {
      conditions.OR = [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { body: { contains: props.body.search, mode: "insensitive" } },
      ];
    }

    // Filter by inquiry type
    if (props.body.inquiry_type) {
      conditions.inquiry_type = props.body.inquiry_type;
    }

    // Filter by priority
    if (props.body.priority) {
      conditions.priority = props.body.priority;
    }

    // Filter by status
    if (props.body.status) {
      conditions.status = props.body.status;
    }

    // Date range filtering
    if (props.body.created_at_start || props.body.created_at_end) {
      conditions.created_at = {};

      if (props.body.created_at_start) {
        // Convert ISO string to Date for Prisma query
        conditions.created_at.gte = new Date(props.body.created_at_start);
      }

      if (props.body.created_at_end) {
        // Convert ISO string to Date for Prisma query
        conditions.created_at.lte = new Date(props.body.created_at_end);
      }
    }

    return conditions;
  };

  // Build ORDER BY
  const buildOrderBy =
    (): Prisma.shopping_mall_inquiriesOrderByWithRelationInput => {
      if (props.body.order_by) {
        const direction = props.body.order_direction === "asc" ? "asc" : "desc";
        return { [props.body.order_by]: direction };
      }
      return { created_at: "desc" };
    };

  const whereConditions = buildWhereConditions();
  const orderBy = buildOrderBy();

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inquiries.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_inquiries.count({
      where: whereConditions,
    }),
  ]);

  // Convert to API response format
  const resultData = data.map((inquiry) => ({
    id: inquiry.id as string & tags.Format<"uuid">,
    title: inquiry.title,
    body: inquiry.body,
    inquiry_type: inquiry.inquiry_type,
    priority: inquiry.priority,
    status: inquiry.status,
    created_at: toISOStringSafe(inquiry.created_at),
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: resultData,
  };
}
