import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallChannelTransformer } from "../transformers/ShoppingMallChannelTransformer";

export async function getShoppingMallAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallChannel> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { id: props.channelId },
    ...ShoppingMallChannelTransformer.select(),
  });
  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }
  return await ShoppingMallChannelTransformer.transform(channel);
}
