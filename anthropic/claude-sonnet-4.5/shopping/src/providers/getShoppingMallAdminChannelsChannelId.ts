import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallChannel> {
  const { channelId } = props;

  const channel =
    await MyGlobal.prisma.shopping_mall_channels.findUniqueOrThrow({
      where: {
        id: channelId,
        deleted_at: null,
      },
      select: {
        id: true,
        channel_code: true,
        channel_name: true,
      },
    });

  return {
    id: channel.id as string & tags.Format<"uuid">,
    channel_code: channel.channel_code,
    channel_name: channel.channel_name,
  };
}
