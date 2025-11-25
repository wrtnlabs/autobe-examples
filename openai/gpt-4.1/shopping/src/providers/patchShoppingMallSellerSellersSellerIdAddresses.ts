import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellersSellerIdAddresses(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallAddress.IRequest;
}): Promise<IPageIShoppingMallAddress.ISummary> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "Forbidden: cannot access other sellers' addresses.",
      403,
    );
  }

  const {
    search,
    city,
    province,
    country,
    is_default,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    order = "desc",
  } = props.body || {};

  const skip = (page - 1) * limit;
  const where: Record<string, any> = {
    shopping_mall_seller_id: props.sellerId,
  };
  if (city) where.city = city;
  if (province) where.province = province;
  if (country) where.country = country;
  if (is_default !== undefined) where.is_default = is_default;
  if (search) {
    where.OR = [
      { full_name: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { street: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { city: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { province: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
    ];
  }
  const [addresses, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_addresses.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort_by]: order },
    }),
    MyGlobal.prisma.shopping_mall_addresses.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: addresses.map((address) => ({
      id: address.id,
      full_name: address.full_name,
      street: address.street,
      city: address.city,
      province: address.province,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone,
      is_default: address.is_default,
    })),
  };
}
