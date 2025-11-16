import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";
import { IPageIShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingPartner";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShippingPartners(props: {
  admin: AdminPayload;
  body: IShoppingMallShippingPartner.IRequest;
}): Promise<IPageIShoppingMallShippingPartner.ISummary> {
  const {
    partner_name,
    partner_code,
    status,
    description,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body ?? {};

  // Pagination defaults
  const actualPage = page && page > 0 ? page : 1;
  const actualLimit = limit && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (actualPage - 1) * actualLimit;

  // Sorting
  const sortableFields = [
    "partner_name",
    "partner_code",
    "created_at",
    "status",
  ];
  const orderByField =
    sort_by && sortableFields.includes(sort_by) ? sort_by : "partner_name";
  const orderByDirection = sort_order === "desc" ? "desc" : "asc";

  // Build where condition immutably
  const where = {
    ...(partner_name && { partner_name: { contains: partner_name } }),
    ...(partner_code && { partner_code: { contains: partner_code } }),
    ...(status && { status }),
    ...(description && { description: { contains: description } }),
  };

  // Query DB concurrently
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipping_partners.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: actualLimit,
    }),
    MyGlobal.prisma.shopping_mall_shipping_partners.count({ where }),
  ]);

  // Map DB records
  const data = items.map((p) => ({
    id: p.id,
    partner_name: p.partner_name,
    partner_code: p.partner_code,
    status: p.status,
    description: p.description,
    created_at: toISOStringSafe(p.created_at),
    updated_at: toISOStringSafe(p.updated_at),
    deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : undefined,
  }));

  const pages = Math.ceil(total / actualLimit);

  return {
    pagination: {
      current: actualPage satisfies number as number,
      limit: actualLimit satisfies number as number,
      records: total,
      pages,
    },
    data,
  };
}
