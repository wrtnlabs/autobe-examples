import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBrowse(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper filtering
  const whereInput: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.section_id && { id: props.body.section_id }),
  };
  // Get paginated data with transformer select
  const sections = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereInput,
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: { display_order: "asc" },
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where: whereInput,
  });
  // Transform to response format using the transformer
  const summaries = await Promise.all(
    sections.map((section) =>
      DiscussionBoardSectionAtSummaryTransformer.transform(section),
    ),
  );
  // Calculate pagination with proper type handling for Typia tags
  const totalPages = Math.ceil(total / limit);
  // Create base pagination with proper satisfies pattern
  const basePagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total satisfies number as number,
    pages: totalPages satisfies number as number,
  } satisfies IPage.IPagination;
  // Build the pagination chain correctly
  const distributionStatisticPagination = {
    pagination: basePagination,
    data: [] as IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
  } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;
  const promotionRequestPagination = {
    pagination: distributionStatisticPagination,
    data: [] as IDiscussionBoardAdministratorPromotionRequest.IPagination[],
  } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;
  // Return the correct structure for IPageIDiscussionBoardSection.ISummary
  return {
    pagination: promotionRequestPagination,
    data: summaries,
  } satisfies IPageIDiscussionBoardSection.ISummary;
}
