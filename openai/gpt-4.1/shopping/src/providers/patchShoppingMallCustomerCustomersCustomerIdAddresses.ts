import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCustomersCustomerIdAddresses(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IRequest;
}): Promise<IPageIShoppingMallAddress.ISummary> {
  // Authorization: allow only if the actor is owner or admin.
  if (props.customer.id !== props.customerId) {
    throw new HttpException("Access denied: not your addresses.", 403);
  }

  // Pagination/defaults.
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build filter conditions.
  const where: Record<string, unknown> = {
    shopping_mall_customer_id: props.customerId,
    ...(props.body.city && { city: props.body.city }),
    ...(props.body.province && { province: props.body.province }),
    ...(props.body.country && { country: props.body.country }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
  };

  // Search filter. Apply to full_name, street, city, province, phone (OR).
  if (props.body.search && props.body.search.trim().length > 0) {
    const searchText = props.body.search;
    where.OR = [
      { full_name: { contains: searchText, mode: "insensitive" } },
      { street: { contains: searchText, mode: "insensitive" } },
      { city: { contains: searchText, mode: "insensitive" } },
      { province: { contains: searchText, mode: "insensitive" } },
      { phone: { contains: searchText, mode: "insensitive" } },
    ];
  }

  // Sorting
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.order ?? "desc";

  const [rows, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_addresses.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_addresses.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: rows.map((addr) => ({
      id: addr.id,
      full_name: addr.full_name,
      street: addr.street,
      city: addr.city,
      province: addr.province,
      postal_code: addr.postal_code,
      country: addr.country,
      phone: addr.phone,
      is_default: addr.is_default,
    })),
  };
}
