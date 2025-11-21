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

export async function patchShoppingMallChannels(props: {
  body: IShoppingMallChannel.IRequest;
}): Promise<IPageIShoppingMallChannel.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where: Prisma.shopping_mall_channelsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.code && { code: props.body.code }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
        { code: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };

  // Build orderBy
  const orderBy: Prisma.shopping_mall_channelsOrderByWithRelationInput = {};
  if (props.body.order_by) {
    const direction = props.body.order_direction === "asc" ? "asc" : "desc";
    orderBy[props.body.order_by] = direction;
  } else {
    orderBy.created_at = "desc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_channels.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_channels.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description ?? undefined,
      code: channel.code,
    })),
  };
}
