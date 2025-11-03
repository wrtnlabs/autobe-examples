import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";
import { IPageIShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomerAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminCustomersCustomerIdAddresses(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingCustomerAddress.IRequest;
}): Promise<IPageIShoppingCustomerAddress> {
  const { customerId, body } = props;
  // Build where clause
  const where = {
    shopping_customer_id: customerId,
    ...(body.is_primary !== undefined && { is_primary: body.is_primary }),
    ...(body.include_deleted !== undefined && body.include_deleted === true
      ? {} // include all (including soft-deleted)
      : { deleted_at: null }),
  };

  // Determine ordering
  const sortField = body.sort ?? "created_at";
  const sortOrder = body.order ?? "desc";

  // Pagination
  const limit = body.limit ?? 100;
  const page = body.page ?? 1;
  const skip = (Number(page) - 1) * Number(limit);

  // Query addresses and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_customer_addresses.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_customer_addresses.count({ where }),
  ]);

  // Map to DTO
  const data = rows.map((addr) => ({
    id: addr.id,
    shopping_customer_id: addr.shopping_customer_id,
    address_line1: addr.address_line1,
    address_line2: addr.address_line2 ?? undefined,
    city: addr.city,
    state: addr.state,
    postal_code: addr.postal_code,
    country: addr.country,
    is_primary: addr.is_primary,
    phone: addr.phone,
    recipient_name: addr.recipient_name,
    created_at: toISOStringSafe(addr.created_at),
    updated_at: toISOStringSafe(addr.updated_at),
    deleted_at: addr.deleted_at ? toISOStringSafe(addr.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
