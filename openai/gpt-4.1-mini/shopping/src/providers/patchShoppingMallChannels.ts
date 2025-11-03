import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";
import { IPageIShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelDefinition";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallChannels(props: {
  body: IShoppingMallChannelDefinition.IRequest;
}): Promise<IPageIShoppingMallChannelDefinition.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.filter_channel_code !== undefined &&
      body.filter_channel_code !== null && {
        channel_code: { contains: body.filter_channel_code },
      }),
    ...(body.filter_channel_name !== undefined &&
      body.filter_channel_name !== null && {
        channel_name: { contains: body.filter_channel_name },
      }),
    ...(body.search_text !== undefined &&
      body.search_text !== null && {
        OR: [
          { channel_code: { contains: body.search_text } },
          { channel_name: { contains: body.search_text } },
          { description: { contains: body.search_text } },
        ],
      }),
  };

  const orderBy =
    body.sort_by === "channel_code"
      ? { channel_code: body.sort_order }
      : body.sort_by === "channel_name"
        ? { channel_name: body.sort_order }
        : { created_at: body.sort_order };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_channel_definitions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_channel_definitions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total && total >= 0 ? total : 0,
      pages: Math.ceil((total && total > 0 ? total : 0) / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      channel_code: record.channel_code,
      channel_name: record.channel_name,
      description: record.description ?? undefined,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
