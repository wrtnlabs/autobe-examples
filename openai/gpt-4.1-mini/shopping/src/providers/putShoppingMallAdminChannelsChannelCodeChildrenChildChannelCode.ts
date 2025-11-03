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

export async function putShoppingMallAdminChannelsChannelCodeChildrenChildChannelCode(props: {
  admin: AdminPayload;
  channelCode: string;
  childChannelCode: string;
  body: IShoppingMallChannelDefinition.IUpdate;
}): Promise<IShoppingMallChannelDefinition> {
  const { admin, channelCode, childChannelCode, body } = props;

  const parentChannel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        channel_code: channelCode,
      },
    });
  if (!parentChannel) {
    throw new HttpException(
      `Parent channel with code '${channelCode}' not found`,
      404,
    );
  }

  const childChannel =
    await MyGlobal.prisma.shopping_mall_channel_definitions.findFirst({
      where: {
        channel_code: childChannelCode,
        parent_channel_id: parentChannel.id,
      },
    });
  if (!childChannel) {
    throw new HttpException(
      `Child channel with code '${childChannelCode}' under parent channel '${channelCode}' not found`,
      404,
    );
  }

  if ("parent_channel_id" in body) {
    const newParentId = body.parent_channel_id ?? null;
    if (newParentId !== childChannel.parent_channel_id) {
      if (newParentId !== null) {
        let currentParentId: (string & tags.Format<"uuid">) | null =
          newParentId;
        while (currentParentId !== null) {
          if (currentParentId === childChannel.id) {
            throw new HttpException("Cycle detected in channel hierarchy", 409);
          }
          const parent: { parent_channel_id: string | null } | null =
            await MyGlobal.prisma.shopping_mall_channel_definitions.findUnique({
              where: { id: currentParentId },
              select: { parent_channel_id: true },
            });
          if (!parent) break;
          currentParentId = parent.parent_channel_id ?? null;
        }
      }
    }
  }

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const updateData = {
    parent_channel_id:
      body.parent_channel_id === null ? undefined : body.parent_channel_id,
    channel_code: childChannel.channel_code,
    channel_name: body.channel_name ?? undefined,
    description: body.description ?? undefined,
    updated_at: now,
  } satisfies IShoppingMallChannelDefinition.IUpdate;

  const updated =
    await MyGlobal.prisma.shopping_mall_channel_definitions.update({
      where: { id: childChannel.id },
      data: updateData,
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    parent_channel_id: updated.parent_channel_id ?? null,
    channel_code: updated.channel_code,
    channel_name: updated.channel_name ?? null,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
