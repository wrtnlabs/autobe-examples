import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallChannels(props: {
  body: IShoppingMallChannel.IRequest;
}): Promise<IPageIShoppingMallChannel.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 30;
  const offset = props.body.offset ?? 0;

  // Build where condition
  const where: any = {
    AND: [{}],
  };

  if (props.body.search) {
    where.AND.push({
      OR: [
        { code: { contains: props.body.search } },
        { name: { contains: props.body.search } },
      ],
    });
  }

  if (props.body.code) {
    where.AND.push({ code: props.body.code });
  }

  if (props.body.status) {
    where.AND.push({ status: props.body.status });
  }

  if (props.body.created_from || props.body.created_to) {
    const createdAtFilter: any = {};
    if (props.body.created_from) {
      createdAtFilter.gte = props.body.created_from;
    }
    if (props.body.created_to) {
      createdAtFilter.lte = props.body.created_to;
    }
    where.AND.push({ created_at: createdAtFilter });
  }

  if (props.body.updated_from || props.body.updated_to) {
    const updatedAtFilter: any = {};
    if (props.body.updated_from) {
      updatedAtFilter.gte = props.body.updated_from;
    }
    if (props.body.updated_to) {
      updatedAtFilter.lte = props.body.updated_to;
    }
    where.AND.push({ updated_at: updatedAtFilter });
  }

  // Build orderBy
  let orderBy: undefined | { [key: string]: "asc" | "desc" } = undefined;
  if (props.body.sort_by && props.body.sort_direction) {
    orderBy = { [props.body.sort_by]: props.body.sort_direction };
  }

  // Calculate skip
  const skip = (page - 1) * limit + offset;

  // Fetch data and total count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_channels.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_channels.count({ where }),
  ]);

  // Map results to ISummary
  const data = results.map((channel) => ({
    id: channel.id,
    code: channel.code,
    name: channel.name,
  }));

  // Build pagination info
  const pagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
