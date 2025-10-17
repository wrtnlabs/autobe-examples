import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.company_name !== undefined &&
      body.company_name !== null && {
        company_name: { contains: body.company_name },
      }),
    ...(body.contact_name !== undefined &&
      body.contact_name !== null && {
        contact_name: { contains: body.contact_name },
      }),
    ...(body.phone_number !== undefined &&
      body.phone_number !== null && {
        phone_number: { contains: body.phone_number },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    deleted_at: null,
  };

  const allowedOrderByFields = [
    "id",
    "email",
    "company_name",
    "contact_name",
    "phone_number",
    "status",
    "created_at",
    "updated_at",
  ];

  const orderByField =
    body.order_by && allowedOrderByFields.includes(body.order_by)
      ? body.order_by
      : "created_at";

  const orderDirection =
    body.order_direction &&
    (body.order_direction.toLowerCase() === "asc" ||
      body.order_direction.toLowerCase() === "desc")
      ? body.order_direction.toLowerCase() === "asc"
        ? "asc"
        : "desc"
      : "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sellers.count({ where }),
  ]);

  const mappedData = data.map((seller) => ({
    id: seller.id,
    email: seller.email,
    password_hash: seller.password_hash,
    company_name:
      seller.company_name === null ? undefined : seller.company_name,
    contact_name:
      seller.contact_name === null ? undefined : seller.contact_name,
    phone_number:
      seller.phone_number === null ? undefined : seller.phone_number,
    status: seller.status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
