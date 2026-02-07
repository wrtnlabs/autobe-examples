import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdImages(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.IRequest;
}): Promise<IPageIDiscussionBoardSectionImage> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_section_imagesWhereInput = {
    discussion_board_section_id: props.sectionId,
  };
  // Apply filters
  if (props.body.image_type) {
    whereInput.image_type = props.body.image_type;
  }
  if (props.body.filename) {
    whereInput.filename = {
      contains: props.body.filename,
      mode: "insensitive",
    };
  }
  if (props.body.mime_type) {
    whereInput.mime_type = props.body.mime_type;
  }
  if (
    props.body.file_size_min !== undefined ||
    props.body.file_size_max !== undefined
  ) {
    whereInput.file_size = {};
    if (props.body.file_size_min !== undefined) {
      whereInput.file_size.gte = props.body.file_size_min;
    }
    if (props.body.file_size_max !== undefined) {
      whereInput.file_size.lte = props.body.file_size_max;
    }
  }
  if (
    props.body.width_min !== undefined ||
    props.body.width_max !== undefined
  ) {
    whereInput.width = {};
    if (props.body.width_min !== undefined) {
      whereInput.width.gte = props.body.width_min;
    }
    if (props.body.width_max !== undefined) {
      whereInput.width.lte = props.body.width_max;
    }
  }
  if (
    props.body.height_min !== undefined ||
    props.body.height_max !== undefined
  ) {
    whereInput.height = {};
    if (props.body.height_min !== undefined) {
      whereInput.height.gte = props.body.height_min;
    }
    if (props.body.height_max !== undefined) {
      whereInput.height.lte = props.body.height_max;
    }
  }
  if (props.body.alt_text) {
    whereInput.alt_text = {
      contains: props.body.alt_text,
      mode: "insensitive",
    };
  }
  // Execute queries sequentially (not Promise.all to avoid race conditions)
  const data = await MyGlobal.prisma.discussion_board_section_images.findMany({
    where: whereInput,
    skip,
    take: limit,
    include: {
      section: {
        select: {
          id: true,
          name: true,
          status: true,
          display_order: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_section_images.count({
    where: whereInput,
  });
  // Transform data to match DTO structure
  const transformedData: IDiscussionBoardSectionImage[] = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    filename: item.filename,
    mime_type: item.mime_type,
    file_size: item.file_size,
    width: item.width,
    height: item.height,
    image_type: item.image_type,
    storage_path: item.storage_path,
    alt_text: item.alt_text,
    section: {
      id: item.section.id as string & tags.Format<"uuid">,
      name: item.section.name,
      status: item.section.status as "active" | "inactive" | "archived",
      display_order: item.section.display_order,
    },
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
