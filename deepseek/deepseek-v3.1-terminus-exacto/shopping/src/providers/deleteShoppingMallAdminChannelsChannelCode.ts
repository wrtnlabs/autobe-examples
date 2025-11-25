import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminChannelsChannelCode(props: {
  admin: AdminPayload;
  channelCode: string;
}): Promise<void> {
  // Find the channel by its unique code, excluding soft-deleted channels
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      code: props.channelCode,
      deleted_at: null,
    },
  });

  // Check if channel exists
  if (!channel) {
    throw new HttpException(
      `Channel with code '${props.channelCode}' not found`,
      404,
    );
  }

  // Check if channel is active - prevent deletion of active channels
  if (channel.status === "active") {
    throw new HttpException(
      `Cannot delete active channel '${props.channelCode}'. Deactivate the channel first.`,
      400,
    );
  }

  // Perform hard deletion
  await MyGlobal.prisma.shopping_mall_channels.delete({
    where: { id: channel.id },
  });
}
