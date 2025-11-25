import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminChannelsChannelCodeSectionsSectionCode(props: {
  admin: AdminPayload;
  channelCode: string;
  sectionCode: string;
}): Promise<void> {
  // Verify the channel exists and is active
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      code: props.channelCode,
      deleted_at: null,
      status: "active",
    },
  });

  if (!channel) {
    throw new HttpException("Shopping channel not found or inactive", 404);
  }

  // Verify the section exists within the specified channel
  const section = await MyGlobal.prisma.shopping_mall_sections.findFirst({
    where: {
      code: props.sectionCode,
      shopping_mall_channel_id: channel.id,
      deleted_at: null,
    },
  });

  if (!section) {
    throw new HttpException("Section not found in the specified channel", 404);
  }

  // Check if section status allows deletion
  if (section.status === "archived") {
    throw new HttpException("Cannot delete an archived section", 400);
  }

  // Check for dependencies - sub-sections that reference this section as parent
  const childSections = await MyGlobal.prisma.shopping_mall_sections.count({
    where: {
      parent_section_id: section.id,
      deleted_at: null,
    },
  });

  if (childSections > 0) {
    throw new HttpException(
      "Cannot delete section with active sub-sections",
      400,
    );
  }

  // Check for products associated with this section
  // Note: This requires the shopping_mall_products schema which we don't have loaded
  // For now, we'll proceed with deletion assuming no product dependencies
  // In a production system, this check should be implemented

  // Perform hard deletion
  await MyGlobal.prisma.shopping_mall_sections.delete({
    where: {
      id: section.id,
    },
  });
}
