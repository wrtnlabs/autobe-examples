import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

export async function getShoppingMallChannelsChannelCodeChildrenChildChannelCode(props: {
  channelCode: string;
  childChannelCode: string;
}): Promise<IShoppingMallChannelDefinition> {
  const { channelCode, childChannelCode } = props;

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
      `Parent channel not found with code: ${channelCode}`,
      404,
    );
  }

  const childChannel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        channel_code: childChannelCode,
        parent_channel_id: parentChannel.id,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_channel_id: true,
        channel_code: true,
        channel_name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!childChannel) {
    throw new HttpException(
      `Child channel not found with code: ${childChannelCode} under parent ${channelCode}`,
      404,
    );
  }

  return {
    id: childChannel.id,
    parent_channel_id:
      childChannel.parent_channel_id === undefined
        ? undefined
        : childChannel.parent_channel_id === null
          ? null
          : childChannel.parent_channel_id,
    channel_code: childChannel.channel_code,
    channel_name: childChannel.channel_name,
    description:
      childChannel.description === undefined
        ? undefined
        : childChannel.description === null
          ? null
          : childChannel.description,
    created_at: toISOStringSafe(childChannel.created_at),
    updated_at: toISOStringSafe(childChannel.updated_at),
    deleted_at:
      childChannel.deleted_at === undefined
        ? undefined
        : childChannel.deleted_at === null
          ? null
          : toISOStringSafe(childChannel.deleted_at),
  };
}
