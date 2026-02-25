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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBrowse(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    status: "active",
    ...(props.body.search &&
      props.body.search.trim() !== "" && {
        OR: [
          {
            name: { contains: props.body.search, mode: "insensitive" as const },
          },
          {
            description: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    ...(props.body.section_id && { id: props.body.section_id }),
  } satisfies Prisma.discussion_board_sectionsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { display_order: "asc" as const },
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardSection.ISummary;
}
