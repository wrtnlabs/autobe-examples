import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminChannelsChannelCode(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallChannelDefinition.IUpdate;
}): Promise<IShoppingMallChannelDefinition> {
  const { admin, channelCode, body } = props;

  if (body.channel_code !== channelCode) {
    throw new HttpException(
      "Channel code in body does not match path parameter",
      400,
    );
  }

  const channel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findUnique({
      where: { channel_code: channelCode },
    });

  if (!channel || channel.deleted_at !== null) {
    throw new HttpException("Channel not found", 404);
  }

  if (body.parent_channel_id !== undefined && body.parent_channel_id !== null) {
    const parent =
      await MyGlobal.prisma.shopping_mall_channel_definitions.findUnique({
        where: { id: body.parent_channel_id },
      });
    if (!parent || parent.deleted_at !== null) {
      throw new HttpException("Parent channel not found", 404);
    }
  }

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const updated =
    await MyGlobal.prisma.shopping_mall_channel_definitions.update({
      where: { channel_code: channelCode },
      data: {
        parent_channel_id:
          body.parent_channel_id === null
            ? null
            : (body.parent_channel_id ?? undefined),
        channel_name:
          body.channel_name === null
            ? undefined
            : (body.channel_name ?? undefined),
        description:
          body.description === null
            ? undefined
            : (body.description ?? undefined),
        updated_at:
          body.updated_at === null
            ? now
            : body.updated_at
              ? toISOStringSafe(body.updated_at)
              : now,
      },
    });

  return {
    id: updated.id,
    parent_channel_id: updated.parent_channel_id ?? undefined,
    channel_code: updated.channel_code,
    channel_name: updated.channel_name ?? undefined,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
