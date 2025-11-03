import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const { channelCode } = props;

  const channel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirstOrThrow({
      where: {
        channel_code: channelCode,
        deleted_at: null,
      },
    });

  await MyGlobal.prisma.shopping_mall_channel_definitions.delete({
    where: { id: channel.id },
  });
}
