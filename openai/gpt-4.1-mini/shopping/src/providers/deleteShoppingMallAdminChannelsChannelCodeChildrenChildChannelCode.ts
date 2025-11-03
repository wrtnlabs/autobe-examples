import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminChannelsChannelCodeChildrenChildChannelCode(props: {
  admin: AdminPayload;
  channelCode: string;
  childChannelCode: string;
}): Promise<void> {
  const { admin, channelCode, childChannelCode } = props;

  // Step 1: Locate parent channel by channelCode
  const parentChannel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        channel_code: channelCode,
        deleted_at: null,
      },
    });

  if (!parentChannel) {
    throw new HttpException(
      `Parent channel with code ${channelCode} not found`,
      404,
    );
  }

  // Step 2: Locate child channel by childChannelCode and parent_channel_id = parent.id
  const childChannel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        channel_code: childChannelCode,
        parent_channel_id: parentChannel.id,
        deleted_at: null,
      },
    });

  if (!childChannel) {
    throw new HttpException(
      `Child channel with code ${childChannelCode} not found under parent channel ${channelCode}`,
      404,
    );
  }

  // Step 3: Hard delete the child channel
  await MyGlobal.prisma.shopping_mall_channel_definitions.delete({
    where: { id: childChannel.id },
  });
}
