import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminChannelsChannelId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, channelId } = props;

  // Verify channel exists and check current deletion status
  const channel =
    await MyGlobal.prisma.shopping_mall_channels.findUniqueOrThrow({
      where: { id: channelId },
      select: {
        id: true,
        deleted_at: true,
      },
    });

  // Prevent double deletion
  if (channel.deleted_at !== null) {
    throw new HttpException("Channel has already been deleted", 400);
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_channels.update({
    where: { id: channelId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
