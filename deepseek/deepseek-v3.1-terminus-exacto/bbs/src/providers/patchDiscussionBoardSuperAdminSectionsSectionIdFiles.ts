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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminSectionsSectionIdFiles(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionFile.IRequest;
}): Promise<IPageIDiscussionBoardSectionFile.ISummary> {
  // Verify section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  // Build WHERE clause
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    deleted_at: null,
    ...(props.body.filename !== undefined && {
      filename: { contains: props.body.filename },
    }),
    ...(props.body.file_type !== undefined && {
      file_type: props.body.file_type,
    }),
    ...(props.body.description !== undefined && {
      description: { contains: props.body.description },
    }),
    ...(props.body.file_size_min !== undefined && {
      file_size: { gte: props.body.file_size_min },
    }),
    ...(props.body.file_size_max !== undefined && {
      file_size: { lte: props.body.file_size_max },
    }),
  } satisfies Prisma.discussion_board_section_filesWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_files.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_section_files.count({ where: whereInput }),
  ]);
  const pages = Math.ceil(total / limit);
  // Build the correct pagination structure
  const basePagination: IPage.IPagination = {
    current: page satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    limit: limit satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    records: total satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    pages: pages satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
  const adminDistributionPagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: basePagination,
      data: [] satisfies IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
    };
  const adminPromotionPagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: adminDistributionPagination,
      data: [] satisfies IDiscussionBoardAdministratorPromotionRequest.IPagination[],
    };
  const sectionPagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: adminPromotionPagination,
    data: [] satisfies IDiscussionBoardSection.IPagination[],
  };
  return {
    data: data.map(
      (file) =>
        ({
          id: file.id as string & tags.Format<"uuid">,
          filename: file.filename,
          file_type: file.file_type,
          file_size: file.file_size,
          created_at: toISOStringSafe(file.created_at) as string &
            tags.Format<"date-time">,
          description: file.description ?? undefined,
        }) satisfies IDiscussionBoardSectionFile.ISummary,
    ),
    pagination: sectionPagination,
  } satisfies IPageIDiscussionBoardSectionFile.ISummary;
}
