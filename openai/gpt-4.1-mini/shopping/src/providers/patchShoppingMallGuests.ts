import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallGuests(props: {
  body: IShoppingMallGuest.IRequest;
}): Promise<IPageIShoppingMallGuest.ISummary> {
  const page = (props.body.page && props.body.page > 0
    ? props.body.page
    : 1) satisfies number as number;
  const limit = (props.body.limit &&
  props.body.limit > 0 &&
  props.body.limit <= 100
    ? props.body.limit
    : 100) satisfies number as number;
  const skip = (page - 1) * limit;

  // Build where condition based on filter request
  const where: Prisma.shopping_mall_guestsWhereInput = {
    deleted_at: props.body.deleted_at_is_null === true ? null : undefined,
    AND: [],
  };

  if (props.body.search) {
    where.OR = [{ id: { equals: props.body.search } }];
  }

  if (props.body.created_at_from || props.body.created_at_to) {
    where.created_at = {};
    if (props.body.created_at_from)
      where.created_at.gte = props.body.created_at_from;
    if (props.body.created_at_to)
      where.created_at.lte = props.body.created_at_to;
  }

  if (props.body.updated_at_from || props.body.updated_at_to) {
    where.updated_at = {};
    if (props.body.updated_at_from)
      where.updated_at.gte = props.body.updated_at_from;
    if (props.body.updated_at_to)
      where.updated_at.lte = props.body.updated_at_to;
  }

  if (Array.isArray(where.AND) && where.AND.length === 0) where.AND = undefined;

  const [guests, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_guests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_guests.count({ where }),
  ]);

  return {
    data: guests.map((guest) => ({
      id: guest.id,
      created_at: toISOStringSafe(guest.created_at),
      last_active_at: null,
      ip_address: undefined,
      user_agent: null,
      referer_url: null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
  };
}
