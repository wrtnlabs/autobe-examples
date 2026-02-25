import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionFile";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminSectionsSectionIdFiles(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionFile.IRequest;
}): Promise<IPageIDiscussionBoardSectionFile.ISummary> {
  // Verify section exists and admin has permissions
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  // Build WHERE clause from request filters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: null,
    ...(props.body.filename && {
      filename: { contains: props.body.filename },
    }),
    ...(props.body.file_type && {
      file_type: props.body.file_type,
    }),
    ...(props.body.file_size_min !== undefined &&
      props.body.file_size_max !== undefined && {
        file_size: {
          gte: props.body.file_size_min,
          lte: props.body.file_size_max,
        },
      }),
    ...(props.body.file_size_min !== undefined &&
      props.body.file_size_max === undefined && {
        file_size: { gte: props.body.file_size_min },
      }),
    ...(props.body.file_size_min === undefined &&
      props.body.file_size_max !== undefined && {
        file_size: { lte: props.body.file_size_max },
      }),
    ...(props.body.description && {
      description: { contains: props.body.description },
    }),
  } satisfies Prisma.discussion_board_section_filesWhereInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_files.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        filename: true,
        file_type: true,
        file_size: true,
        created_at: true,
        description: true,
      },
    }),
    MyGlobal.prisma.discussion_board_section_files.count({ where: whereInput }),
  ]);
  // Transform results
  const transformedData = data.map((file) => ({
    id: file.id,
    filename: file.filename,
    file_type: file.file_type,
    file_size: file.file_size,
    created_at: file.created_at.toISOString(),
    description: file.description ?? null,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
