import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionArchiveAtSummaryTransformer } from "../transformers/DiscussionBoardSectionArchiveAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsArchives(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSectionArchive.IRequest;
}): Promise<IPageIDiscussionBoardSectionArchive.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" },
    }),
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
  // Handle sorting
  const orderByInput = (
    props.body.sort === "archived_at_asc"
      ? { archived_at: "asc" as const }
      : props.body.sort === "reason_asc"
        ? { reason: "asc" as const }
        : props.body.sort === "reason_desc"
          ? { reason: "desc" as const }
          : { archived_at: "desc" as const }
  ) satisfies Prisma.discussion_board_section_archivesOrderByWithRelationInput;
  // Get data and count
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
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionArchiveAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
  };
}
