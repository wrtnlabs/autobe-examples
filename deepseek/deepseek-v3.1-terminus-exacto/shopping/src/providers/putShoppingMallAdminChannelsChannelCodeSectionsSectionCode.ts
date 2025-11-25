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

export async function putShoppingMallAdminChannelsChannelCodeSectionsSectionCode(props: {
  admin: AdminPayload;
  channelCode: string;
  sectionCode: string;
  body: IShoppingMallSection.IUpdate;
}): Promise<IShoppingMallSection> {
  // First verify the channel exists
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      code: props.channelCode,
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException("Shopping channel not found", 404);
  }

  // Verify the section exists within this channel
  const existingSection =
    await MyGlobal.prisma.shopping_mall_sections.findFirst({
      where: {
        shopping_mall_channel_id: channel.id,
        code: props.sectionCode,
        deleted_at: null,
      },
    });

  if (!existingSection) {
    throw new HttpException("Shopping section not found", 404);
  }

  // Validate parent_section_id if provided
  if (
    props.body.parent_section_id !== undefined &&
    props.body.parent_section_id !== null
  ) {
    const parentSection =
      await MyGlobal.prisma.shopping_mall_sections.findFirst({
        where: {
          id: props.body.parent_section_id,
          shopping_mall_channel_id: channel.id,
          deleted_at: null,
        },
      });

    if (!parentSection) {
      throw new HttpException(
        "Parent section not found or does not belong to this channel",
        400,
      );
    }

    // Prevent circular references
    if (parentSection.id === existingSection.id) {
      throw new HttpException("Section cannot be its own parent", 400);
    }
  }

  // Validate display_order conflicts
  if (props.body.display_order !== undefined) {
    const conflictingSection =
      await MyGlobal.prisma.shopping_mall_sections.findFirst({
        where: {
          shopping_mall_channel_id: channel.id,
          parent_section_id:
            props.body.parent_section_id !== undefined
              ? props.body.parent_section_id
              : existingSection.parent_section_id,
          display_order: props.body.display_order,
          deleted_at: null,
          NOT: {
            id: existingSection.id,
          },
        },
      });

    if (conflictingSection) {
      throw new HttpException(
        "Another section already has this display order",
        400,
      );
    }
  }

  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = ["active", "inactive", "hidden", "archived"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
  }

  // Prepare update data with proper null/undefined handling
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Handle each field with proper null/undefined handling based on DTO
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }

  if (props.body.description !== undefined) {
    updateData.description =
      props.body.description === null ? null : props.body.description;
  }

  if (props.body.parent_section_id !== undefined) {
    updateData.parent_section_id =
      props.body.parent_section_id === null
        ? null
        : props.body.parent_section_id;
  }

  if (props.body.display_order !== undefined) {
    updateData.display_order = props.body.display_order;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  if (props.body.configuration !== undefined) {
    updateData.configuration =
      props.body.configuration === null ? null : props.body.configuration;
  }

  // Update the section
  const updatedSection = await MyGlobal.prisma.shopping_mall_sections.update({
    where: {
      id: existingSection.id,
    },
    data: updateData,
  });

  // Return the updated section with proper date formatting
  return {
    id: updatedSection.id,
    code: updatedSection.code,
    name: updatedSection.name,
    description: updatedSection.description ?? undefined,
    display_order: updatedSection.display_order,
    status: updatedSection.status,
    configuration: updatedSection.configuration ?? undefined,
    created_at: toISOStringSafe(updatedSection.created_at),
    updated_at: toISOStringSafe(updatedSection.updated_at),
    deleted_at: updatedSection.deleted_at
      ? toISOStringSafe(updatedSection.deleted_at)
      : undefined,
  };
}
