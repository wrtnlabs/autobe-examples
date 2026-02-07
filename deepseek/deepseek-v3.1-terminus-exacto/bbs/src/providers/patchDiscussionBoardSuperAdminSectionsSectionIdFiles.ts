import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsSectionIdFiles(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionFile.IRequest;
}): Promise<IPageIDiscussionBoardSectionFile.ISummary> {
  // Verify section exists and super admin has access
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId, deleted_at: null },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Use default pagination if not provided
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause with available filters
  const whereInput: Prisma.discussion_board_section_filesWhereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: null,
    ...(props.body.file_type && { file_type: props.body.file_type }),
    ...(props.body.description && {
      description: { contains: props.body.description },
    }),
  };
  // Get paginated data
  const data = await MyGlobal.prisma.discussion_board_section_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      filename: true,
      file_type: true,
      file_size: true,
      description: true,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_section_files.count({
    where: whereInput,
  });
  // Transform data to response format
  const transformedData = data.map((file) => ({
    id: file.id as string & tags.Format<"uuid">,
    filename: file.filename,
    file_type: file.file_type,
    file_size: file.file_size as number & tags.Type<"int32">,
    description: file.description === null ? undefined : file.description,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
