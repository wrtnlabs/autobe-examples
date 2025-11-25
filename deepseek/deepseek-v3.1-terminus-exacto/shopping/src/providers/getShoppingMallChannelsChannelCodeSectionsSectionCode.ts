import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function getShoppingMallChannelsChannelCodeSectionsSectionCode(props: {
  channelCode: string;
  sectionCode: string;
}): Promise<IShoppingMallSection> {
  // First verify the channel exists
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: {
      code: props.channelCode,
    },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  // Then find the section within that channel
  const section = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      code: props.sectionCode,
      shopping_mall_channel_id: channel.id,
    },
  });

  if (!section) {
    throw new HttpException("Section not found", 404);
  }

  // Return the section data with proper type conversions
  return {
    id: section.id,
    code: section.code,
    name: section.name,
    description: section.description ?? undefined,
    display_order: section.display_order,
    status: section.status,
    configuration: section.configuration ?? undefined,
    created_at: toISOStringSafe(section.created_at),
    updated_at: toISOStringSafe(section.updated_at),
    deleted_at: section.deleted_at
      ? toISOStringSafe(section.deleted_at)
      : undefined,
  };
}
