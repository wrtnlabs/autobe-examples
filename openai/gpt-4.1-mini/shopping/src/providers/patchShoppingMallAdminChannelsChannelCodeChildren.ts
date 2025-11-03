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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminChannelsChannelCodeChildren(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallChannelDefinition.IRequest;
}): Promise<IPageIShoppingMallChannelDefinition.ISummary> {
  const { admin, channelCode, body } = props;

  const parentChannel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        channel_code: channelCode,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });

  if (!parentChannel) {
    throw new HttpException(
      `Parent channel with code '${channelCode}' not found.`,
      404,
    );
  }

  const {
    page,
    limit,
    search_text,
    filter_channel_code,
    filter_channel_name,
    sort_by,
    sort_order,
  } = body;

  const allowedSortFields = ["channel_code", "channel_name", "created_at"];
  const sortField = allowedSortFields.includes(sort_by)
    ? sort_by
    : "created_at";
  const sortOrder = sort_order === "asc" ? "asc" : "desc";

  const whereClause = {
    parent_channel_id: parentChannel.id,
    deleted_at: null,
    ...(search_text !== null && search_text !== undefined
      ? {
          OR: [
            { channel_code: { contains: search_text } },
            { channel_name: { contains: search_text } },
            { description: { contains: search_text } },
          ],
        }
      : {}),
    ...(filter_channel_code !== null && filter_channel_code !== undefined
      ? { channel_code: filter_channel_code }
      : {}),
    ...(filter_channel_name !== null && filter_channel_name !== undefined
      ? { channel_name: filter_channel_name }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [children, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_channel_definitions.findMany({
      where: whereClause,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        channel_code: true,
        channel_name: true,
        description: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_channel_definitions.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: children.map((child) => ({
      id: child.id,
      channel_code: child.channel_code,
      channel_name: child.channel_name,
      description: child.description ?? undefined,
      created_at: toISOStringSafe(child.created_at),
    })),
  };
}
