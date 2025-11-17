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

export async function patchShoppingMallShoppingMallGuests(props: {
  body: IShoppingMallGuest.IRequest;
}): Promise<IPageIShoppingMallGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Declare where with explicit any type to avoid TS conflicts during multiple assignments
  const where: any = {};
  if (props.body.created_after && props.body.created_before) {
    where.created_at = {
      gte: props.body.created_after,
      lte: props.body.created_before,
    };
  } else {
    if (props.body.created_after) {
      where.created_at = { gte: props.body.created_after };
    }
    if (props.body.created_before) {
      where.created_at = { lte: props.body.created_before };
    }
  }

  if (props.body.updated_after && props.body.updated_before) {
    where.updated_at = {
      gte: props.body.updated_after,
      lte: props.body.updated_before,
    };
  } else {
    if (props.body.updated_after) {
      where.updated_at = { gte: props.body.updated_after };
    }
    if (props.body.updated_before) {
      where.updated_at = { lte: props.body.updated_before };
    }
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_guests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: { id: true, created_at: true, updated_at: true },
    }),
    MyGlobal.prisma.shopping_mall_guests.count({ where }),
  ]);

  return {
    data: records.map((record) => ({
      id: record.id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
