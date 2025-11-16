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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomersCustomerIdAddresses(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IRequest;
}): Promise<IPageIShoppingMallAddress.ISummary> {
  const {
    search,
    city,
    province,
    country,
    is_default,
    page,
    limit,
    sort_by,
    order,
  } = props.body ?? {};

  // Pagination
  const realLimit = limit !== undefined ? limit : 10;
  const realPage = page !== undefined ? page : 1;
  const skip = (realPage - 1) * realLimit;

  // Build where condition
  const where: Record<string, any> = {
    customer_id: props.customerId,
    ...(city !== undefined && { city }),
    ...(province !== undefined && { province }),
    ...(country !== undefined && { country }),
    ...(is_default !== undefined && { is_default }),
    ...(search && {
      OR: [
        { full_name: { contains: search } },
        { street: { contains: search } },
        { city: { contains: search } },
        { province: { contains: search } },
        { phone: { contains: search } },
      ],
    }),
  };

  // Order by
  let orderBy: any = { created_at: "desc" };
  if (sort_by) {
    orderBy = {};
    orderBy[sort_by] = order ?? "desc";
  }

  // Query addresses and count
  const [addresses, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_addresses.findMany({
      where,
      skip,
      take: realLimit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_addresses.count({ where }),
  ]);

  return {
    pagination: {
      current: realPage,
      limit: realLimit,
      records,
      pages: Math.ceil(records / realLimit),
    },
    data: addresses.map((a) => ({
      id: a.id,
      full_name: a.full_name,
      street: a.street,
      city: a.city,
      province: a.province,
      postal_code: a.postal_code,
      country: a.country,
      phone: a.phone,
      is_default: a.is_default,
    })),
  };
}
