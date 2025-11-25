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

export async function postShoppingMallAdminChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannel.ICreate;
}): Promise<IShoppingMallChannel> {
  // Check if channel code already exists
  const existingChannel =
    await MyGlobal.prisma.shopping_mall_channels.findFirst({
      where: {
        code: props.body.code,
        deleted_at: null,
      },
    });

  if (existingChannel) {
    throw new HttpException("Channel code already exists", 400);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_channels.create({
    data: {
      id: v4(),
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      status: props.body.status,
      configuration: props.body.configuration ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Build the response object with proper type handling
  const result: IShoppingMallChannel = {
    id: created.id,
    code: created.code,
    name: created.name,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };

  // Handle optional fields with proper null/undefined conversion
  if (created.description !== null) {
    result.description = created.description;
  }

  if (created.configuration !== null) {
    // Parse configuration JSON and map to ISummary structure
    const configData = JSON.parse(created.configuration);
    result.configuration = {
      id: configData.id ?? v4(),
      config_key: configData.config_key ?? `channel.${created.code}`,
      data_type: configData.data_type ?? "json",
      scope: configData.scope ?? "channel",
      environment: configData.environment ?? "production",
      is_encrypted: configData.is_encrypted ?? false,
      version: configData.version ?? 1,
      description:
        configData.description ?? `Configuration for channel ${created.name}`,
      created_at: configData.created_at ?? now,
      updated_at: configData.updated_at ?? now,
      deleted_at: configData.deleted_at ?? undefined,
    };
  }

  // Parent field is undefined as this is a new channel
  result.parent = undefined;

  return result;
}
