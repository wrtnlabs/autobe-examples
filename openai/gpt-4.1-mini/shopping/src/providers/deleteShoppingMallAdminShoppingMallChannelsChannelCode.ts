import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallChannelsChannelCode(props: {
  admin: AdminPayload;
  channelCode: string;
}): Promise<void> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { code: props.channelCode },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_channels.delete({
    where: { code: props.channelCode },
  });
}
