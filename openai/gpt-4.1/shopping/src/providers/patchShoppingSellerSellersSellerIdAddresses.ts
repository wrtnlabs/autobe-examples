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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerSellersSellerIdAddresses(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSellerAddress.IRequest;
}): Promise<IPageIShoppingSellerAddress> {
  const { seller, sellerId, body } = props;

  // Authorization: Must only access own addresses
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Unauthorized: sellers can only view their own addresses",
      403,
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const where = {
    shopping_seller_id: sellerId,
    deleted_at: null,
    ...(body.is_primary !== undefined && { is_primary: body.is_primary }),
    ...(body.is_return_address !== undefined && {
      is_return_address: body.is_return_address,
    }),
    ...(body.city !== undefined &&
      body.city !== null && { city: { contains: body.city } }),
    ...(body.state !== undefined &&
      body.state !== null && { state: { contains: body.state } }),
    ...(body.country !== undefined &&
      body.country !== null && { country: { contains: body.country } }),
  };

  const allowedSort = [
    "updated_at",
    "created_at",
    "city",
    "state",
    "country",
    "is_primary",
    "is_return_address",
  ];
  const sortBy =
    body.sort_by && allowedSort.includes(body.sort_by)
      ? body.sort_by
      : "updated_at";
  const sortOrder: "asc" | "desc" = body.sort_order === "asc" ? "asc" : "desc";

  const [addresses, total] = await Promise.all([
    MyGlobal.prisma.shopping_seller_addresses.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_seller_addresses.count({ where }),
  ]);

  const data = addresses.map((addr) => ({
    id: addr.id,
    shopping_seller_id: addr.shopping_seller_id,
    address_line1: addr.address_line1,
    address_line2: addr.address_line2 ?? null,
    city: addr.city,
    state: addr.state,
    postal_code: addr.postal_code,
    country: addr.country,
    is_return_address: addr.is_return_address,
    is_primary: addr.is_primary,
    phone: addr.phone,
    created_at: toISOStringSafe(addr.created_at),
    updated_at: toISOStringSafe(addr.updated_at),
    deleted_at: addr.deleted_at ? toISOStringSafe(addr.deleted_at) : null,
    recipient_name: "",
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
