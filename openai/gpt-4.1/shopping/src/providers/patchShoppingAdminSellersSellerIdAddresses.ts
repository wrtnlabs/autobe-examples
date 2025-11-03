import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import { IPageIShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSellerAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminSellersSellerIdAddresses(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSellerAddress.IRequest;
}): Promise<IPageIShoppingSellerAddress> {
  const { sellerId, body } = props;

  // 1. Verify seller exists (reject 404 if not)
  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { id: sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  // 2. Prepare pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Prepare filters
  const where = {
    shopping_seller_id: sellerId,
    ...(body.is_primary !== undefined ? { is_primary: body.is_primary } : {}),
    ...(body.is_return_address !== undefined
      ? { is_return_address: body.is_return_address }
      : {}),
    ...(body.city !== undefined ? { city: { contains: body.city } } : {}),
    ...(body.state !== undefined ? { state: { contains: body.state } } : {}),
    ...(body.country !== undefined
      ? { country: { contains: body.country } }
      : {}),
    deleted_at: null,
  };

  // 4. Prepare sorting
  let orderBy: { [key: string]: "asc" | "desc" } = { updated_at: "desc" };
  if (body.sort_by) {
    orderBy = { [body.sort_by]: body.sort_order ?? "desc" };
  }

  // 5. Query records and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_seller_addresses.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_seller_addresses.count({ where }),
  ]);

  // 6. Map results to IShoppingSellerAddress[]
  const data = rows.map((row) => ({
    id: row.id,
    shopping_seller_id: row.shopping_seller_id,
    address_line1: row.address_line1,
    address_line2: row.address_line2 ?? undefined,
    city: row.city,
    state: row.state,
    postal_code: row.postal_code,
    country: row.country,
    is_return_address: row.is_return_address,
    is_primary: row.is_primary,
    phone: row.phone,
    recipient_name: "", // Provide empty fallback since prisma doesn't populate it
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // 7. Construct pagination info
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: pages,
    },
    data,
  };
}
