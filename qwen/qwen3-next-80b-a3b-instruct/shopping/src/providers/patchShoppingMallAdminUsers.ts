import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminUsers(props: {
  admin: AdminPayload;
  body: IShoppingMallUser.IRequest;
}): Promise<IPageIShoppingMallCategory> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const searchTerm = props.body.search;
  const searchCondition = searchTerm
    ? {
        OR: [
          {
            email: { contains: searchTerm, mode: "insensitive" as const },
          },
        ],
      }
    : {};
  const whereInput: Prisma.shopping_mall_usersWhereInput = {
    deleted_at: props.body.status === "deleted" ? undefined : null,
    status: props.body.status ? { in: [props.body.status] } : undefined,
    user_type: props.body.user_type
      ? { in: [props.body.user_type] }
      : undefined,
    AND: [searchCondition],
  };
  const users = await MyGlobal.prisma.shopping_mall_users.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    where: whereInput,
  });
  const total = await MyGlobal.prisma.shopping_mall_users.count({
    where: whereInput,
  });
  // Get customer and seller data for display_name and phone_number
  const customerIds = users
    .filter((user) => user.user_type === "customer")
    .map((user) => user.id);
  const sellerIds = users
    .filter((user) => user.user_type === "seller")
    .map((user) => user.id);
  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, display_name: true, phone_number: true },
  });
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, status: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  return {
    data: await ArrayUtil.asyncMap(users, async (user) => {
      let display_name = undefined;
      let shop_name = undefined;
      let phone_number = undefined;
      if (user.user_type === "customer") {
        const customer = customerMap.get(user.id);
        if (customer) {
          display_name = customer.display_name ?? undefined;
          phone_number = customer.phone_number ?? undefined;
        }
      }
      // For sellers: shop_name is not stored in the database schema, so we return undefined
      // per database schema is absolute source of truth principle
      // status is provided for sellers, undefined for others
      let status = undefined;
      if (user.user_type === "seller") {
        const seller = sellerMap.get(user.id);
        if (seller) {
          status = seller.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended";
        }
      }
      return {
        id: user.id,
        display_name,
        shop_name, // This field is not in database schema, so we return undefined
        status,
        email: user.email,
        phone_number,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at ? user.updated_at.toISOString() : undefined,
        deleted_at: user.deleted_at ? user.deleted_at.toISOString() : null,
      } satisfies IShoppingMallCategory;
    }),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
