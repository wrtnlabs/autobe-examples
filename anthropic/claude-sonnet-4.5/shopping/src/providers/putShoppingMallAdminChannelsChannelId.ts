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

export async function putShoppingMallAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallChannel.IUpdate;
}): Promise<IShoppingMallChannel> {
  const { channelId, body } = props;

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_channels.update({
    where: { id: channelId },
    data: {
      channel_name: body.channel_name ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    channel_code: updated.channel_code,
    channel_name: updated.channel_name,
  };
}
