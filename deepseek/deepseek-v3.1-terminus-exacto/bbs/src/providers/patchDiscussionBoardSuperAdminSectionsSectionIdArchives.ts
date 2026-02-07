import { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionArchiveAtSummaryTransformer } from "../transformers/DiscussionBoardSectionArchiveAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsSectionIdArchives(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionArchive.IRequest;
}): Promise<IPageIDiscussionBoardSectionArchive.ISummary> {
  // Validate that the section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    discussion_board_section_id: props.sectionId,
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.archivedAtFrom && {
      archived_at: { gte: props.body.archivedAtFrom },
    }),
    ...(props.body.archivedAtTo && {
      archived_at: { lte: props.body.archivedAtTo },
    }),
    ...(props.body.archivedBy && {
      archived_by: props.body.archivedBy,
    }),
  } satisfies Prisma.discussion_board_section_archivesWhereInput;
  const orderByInput = (
    props.body.sort === "archived_at_asc"
      ? { archived_at: "asc" as const }
      : props.body.sort === "reason_asc"
        ? { reason: "asc" as const }
        : props.body.sort === "reason_desc"
          ? { reason: "desc" as const }
          : { archived_at: "desc" as const }
  ) satisfies Prisma.discussion_board_section_archivesOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_archives.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardSectionArchiveAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_section_archives.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSectionArchiveAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
