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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallChannelTransformer } from "../transformers/ShoppingMallChannelTransformer";

export async function putShoppingMallSuperAdminChannelsChannelId(props: {
  superAdmin: SuperadminPayload;
  channelId: string;
  body: IShoppingMallChannel.IUpdate;
}): Promise<IShoppingMallChannel> {
  // Verify channel exists
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { id: props.channelId },
  });
  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }
  // Perform partial update with provided fields
  const updated = await MyGlobal.prisma.shopping_mall_channels.update({
    where: { id: props.channelId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Transform to API response type
  return ShoppingMallChannelTransformer.transform(updated);
}
