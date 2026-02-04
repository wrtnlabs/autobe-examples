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

export async function putShoppingMallAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string;
  body: IShoppingMallChannel.IUpdate;
}): Promise<IShoppingMallChannel> {
  // Verify channel exists
  const existing = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { id: props.channelId },
  });
  if (!existing) {
    throw new HttpException("Channel not found", 404);
  }
  // Generate current timestamp compliant with date-time format
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Update channel with provided fields and set updated_at
  const updated = await MyGlobal.prisma.shopping_mall_channels.update({
    where: { id: props.channelId },
    data: {
      ...props.body,
      updated_at: updatedAt,
    },
    ...ShoppingMallChannelTransformer.select(),
  });
  // Return transformed response
  return await ShoppingMallChannelTransformer.transform(updated);
}
