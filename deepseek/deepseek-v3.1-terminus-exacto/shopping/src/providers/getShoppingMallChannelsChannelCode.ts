import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

export async function getShoppingMallChannelsChannelCode(props: {
  channelCode: string;
}): Promise<IShoppingMallChannel> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      code: props.channelCode,
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  let configuration: IShoppingMallConfiguration.ISummary | undefined;
  if (channel.configuration) {
    try {
      configuration = JSON.parse(
        channel.configuration,
      ) as IShoppingMallConfiguration.ISummary;
    } catch {
      // If configuration is invalid JSON, treat as undefined
      configuration = undefined;
    }
  }

  return {
    id: channel.id as string & tags.Format<"uuid">,
    code: channel.code,
    name: channel.name,
    description: channel.description ?? undefined,
    status: channel.status,
    configuration,
    parent: undefined, // Parent relationship not implemented in current schema
    created_at: toISOStringSafe(channel.created_at),
    updated_at: toISOStringSafe(channel.updated_at),
  };
}
