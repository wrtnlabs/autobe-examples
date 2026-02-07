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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionImageTransformer } from "../transformers/DiscussionBoardSectionImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsSectionIdImages(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionImage.IRequest;
}): Promise<IPageIDiscussionBoardSectionImage> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Verify the section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Build WHERE clause with section filter and request criteria
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    ...(props.body.image_type && { image_type: props.body.image_type }),
    ...(props.body.filename && {
      filename: { contains: props.body.filename, mode: "insensitive" as const },
    }),
    ...(props.body.mime_type && { mime_type: props.body.mime_type }),
    ...((props.body.file_size_min !== undefined ||
      props.body.file_size_max !== undefined) && {
      file_size: {
        ...(props.body.file_size_min !== undefined && {
          gte: props.body.file_size_min,
        }),
        ...(props.body.file_size_max !== undefined && {
          lte: props.body.file_size_max,
        }),
      },
    }),
    ...((props.body.width_min !== undefined ||
      props.body.width_max !== undefined) && {
      width: {
        ...(props.body.width_min !== undefined && {
          gte: props.body.width_min,
        }),
        ...(props.body.width_max !== undefined && {
          lte: props.body.width_max,
        }),
      },
    }),
    ...((props.body.height_min !== undefined ||
      props.body.height_max !== undefined) && {
      height: {
        ...(props.body.height_min !== undefined && {
          gte: props.body.height_min,
        }),
        ...(props.body.height_max !== undefined && {
          lte: props.body.height_max,
        }),
      },
    }),
    ...(props.body.alt_text && {
      alt_text: { contains: props.body.alt_text, mode: "insensitive" as const },
    }),
  } satisfies Prisma.discussion_board_section_imagesWhereInput;
  const data = await MyGlobal.prisma.discussion_board_section_images.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { filename: "asc" as const },
    ...DiscussionBoardSectionImageTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_section_images.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSectionImageTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
