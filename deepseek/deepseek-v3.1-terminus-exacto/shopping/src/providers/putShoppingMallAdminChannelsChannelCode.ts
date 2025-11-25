import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminChannelsChannelCode(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallChannel.IUpdate;
}): Promise<IShoppingMallChannel> {
  // Find existing channel
  const existingChannel =
    await MyGlobal.prisma.shopping_mall_channels.findFirst({
      where: {
        code: props.channelCode,
        deleted_at: null,
      },
    });

  if (!existingChannel) {
    throw new HttpException("Channel not found", 404);
  }

  // Update channel with provided data
  const updatedChannel = await MyGlobal.prisma.shopping_mall_channels.update({
    where: { id: existingChannel.id },
    data: {
      name: props.body.name !== undefined ? props.body.name : undefined,
      description:
        props.body.description !== undefined
          ? props.body.description === null
            ? null
            : props.body.description
          : undefined,
      status: props.body.status !== undefined ? props.body.status : undefined,
      configuration:
        props.body.configuration !== undefined
          ? props.body.configuration === null
            ? null
            : props.body.configuration
          : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Convert to API response format
  return {
    id: updatedChannel.id as string & tags.Format<"uuid">,
    code: updatedChannel.code,
    name: updatedChannel.name,
    description:
      updatedChannel.description === null
        ? undefined
        : updatedChannel.description,
    status: updatedChannel.status,
    configuration:
      updatedChannel.configuration === null
        ? undefined
        : {
            id: v4() as string & tags.Format<"uuid">,
            config_key: "channel.configuration",
            data_type: "json",
            scope: "channel",
            environment: "production",
            is_encrypted: false,
            version: 1,
            description: "Channel-specific configuration settings",
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: undefined,
          },
    parent: undefined,
    created_at: toISOStringSafe(updatedChannel.created_at),
    updated_at: toISOStringSafe(updatedChannel.updated_at),
  };
}
