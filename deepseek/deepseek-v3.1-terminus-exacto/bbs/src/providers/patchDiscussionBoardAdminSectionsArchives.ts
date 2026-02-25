import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionArchiveTransformer } from "../transformers/DiscussionBoardSectionArchiveTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsArchives(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSectionArchive.IRequest;
}): Promise<IPageIDiscussionBoardSectionArchive> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.reason && { reason: { contains: props.body.reason } }),
    ...(props.body.archived_at_from && {
      archived_at: { gte: new Date(props.body.archived_at_from) },
    }),
    ...(props.body.archived_at_to && {
      archived_at: { lte: new Date(props.body.archived_at_to) },
    }),
    ...(props.body.archived_by && { archived_by: props.body.archived_by }),
    ...(props.body.discussion_board_section_id && {
      discussion_board_section_id: props.body.discussion_board_section_id,
    }),
  } satisfies Prisma.discussion_board_section_archivesWhereInput;
  const orderBy = (
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
      where,
      skip,
      take: limit,
      orderBy,
      ...DiscussionBoardSectionArchiveTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_section_archives.count({ where }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionArchiveTransformer.transform,
  );
  // Create the correct nested pagination structure
  const basePagination = {
    current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  const sectionPagination = {
    pagination: basePagination,
    data: [],
  } satisfies IPageIDiscussionBoardSection.IPagination;
  const adminPromotionPagination = {
    pagination: sectionPagination,
    data: [],
  } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;
  const adminDistributionPagination = {
    pagination: adminPromotionPagination,
    data: [],
  } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;
  return {
    pagination: adminDistributionPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardSectionArchive;
}
