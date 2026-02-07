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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionFileAtSummaryTransformer } from "../transformers/DiscussionBoardSectionFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdFiles(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionFile.IRequest;
}): Promise<IPageIDiscussionBoardSectionFile.ISummary> {
  // Verify section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId, deleted_at: null },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Build WHERE clause
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: null,
    ...(props.body.file_type && { file_type: props.body.file_type }),
    ...(props.body.description &&
      props.body.description.trim() !== "" && {
        description: { contains: props.body.description },
      }),
  } satisfies Prisma.discussion_board_section_filesWhereInput;
  // Pagination setup with defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query data
  const data = await MyGlobal.prisma.discussion_board_section_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardSectionFileAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.discussion_board_section_files.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionFileAtSummaryTransformer.transform,
  );
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
