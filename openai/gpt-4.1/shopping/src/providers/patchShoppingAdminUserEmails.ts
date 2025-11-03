import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingUserEmail";
import { IPageIShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingUserEmail";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminUserEmails(props: {
  admin: AdminPayload;
  body: IShoppingUserEmail.IRequest;
}): Promise<IPageIShoppingUserEmail.ISummary> {
  const { body } = props;
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;
  if (
    body.customer_id !== undefined &&
    body.customer_id !== null &&
    body.seller_id !== undefined &&
    body.seller_id !== null
  ) {
    throw new HttpException(
      "Specify only one of customer_id or seller_id, not both",
      400,
    );
  }
  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && { email: { contains: body.search } }),
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_customer_id: body.customer_id,
        shopping_seller_id: null,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        shopping_customer_id: null,
        shopping_seller_id: body.seller_id,
      }),
    ...(body.is_verified !== undefined &&
      body.is_verified !== null && { is_verified: body.is_verified }),
    ...(body.is_primary !== undefined &&
      body.is_primary !== null && { is_primary: body.is_primary }),
  };
  const orderBy =
    body.order_by === "email" ||
    body.order_by === "created_at" ||
    body.order_by === "updated_at"
      ? {
          [body.order_by]: (body.order === "asc"
            ? "asc"
            : "desc") as Prisma.SortOrder,
        }
      : { created_at: "desc" as Prisma.SortOrder };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_user_emails.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_user_emails.count({ where }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    shopping_customer_id: row.shopping_customer_id ?? undefined,
    shopping_seller_id: row.shopping_seller_id ?? undefined,
    email: row.email,
    is_verified: row.is_verified,
    is_primary: row.is_primary,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
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
