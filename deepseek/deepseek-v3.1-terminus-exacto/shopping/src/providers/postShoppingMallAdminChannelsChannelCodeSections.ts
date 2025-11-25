import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminChannelsChannelCodeSections(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallSection.ICreate;
}): Promise<IShoppingMallSection> {
  // First, verify the channel exists
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      code: props.channelCode,
      deleted_at: null,
      status: "active",
    },
  });

  if (!channel) {
    throw new HttpException(
      `Channel with code '${props.channelCode}' not found or inactive`,
      404,
    );
  }

  // Check if section code is unique within this channel
  const existingSection =
    await MyGlobal.prisma.shopping_mall_sections.findFirst({
      where: {
        shopping_mall_channel_id: channel.id,
        code: props.body.code,
        deleted_at: null,
      },
    });

  if (existingSection) {
    throw new HttpException(
      `Section code '${props.body.code}' already exists in this channel`,
      409,
    );
  }

  // Validate parent section if provided
  if (props.body.parent_section_id) {
    const parentSection =
      await MyGlobal.prisma.shopping_mall_sections.findFirst({
        where: {
          id: props.body.parent_section_id,
          shopping_mall_channel_id: channel.id,
          deleted_at: null,
        },
      });

    if (!parentSection) {
      throw new HttpException("Parent section not found in this channel", 404);
    }
  }

  // Validate status value
  const validStatuses = ["active", "inactive", "hidden", "archived"];
  if (!validStatuses.includes(props.body.status)) {
    throw new HttpException(
      `Invalid status value. Must be one of: ${validStatuses.join(", ")}`,
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const sectionId = v4();

  const created = await MyGlobal.prisma.shopping_mall_sections.create({
    data: {
      id: sectionId,
      shopping_mall_channel_id: channel.id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      parent_section_id: props.body.parent_section_id ?? null,
      display_order: props.body.display_order,
      status: props.body.status,
      configuration: props.body.configuration ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description === null ? undefined : created.description,
    display_order: created.display_order,
    status: created.status,
    configuration:
      created.configuration === null ? undefined : created.configuration,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
