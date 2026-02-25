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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserBrowse(props: {
  user: UserPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  const pageNum: number & tags.Type<"int32"> & tags.Minimum<1> = (props.body
    .page ?? 1) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limitRaw: number = props.body.limit ?? 100;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = Math.min(limitRaw, 100) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (pageNum - 1) * limit;
  const whereInput: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
    status: "active",
  };
  if (props.body.search?.trim()) {
    whereInput.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.section_id) {
    whereInput.id = props.body.section_id;
  }
  const [sections, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_sections.findMany({
      where: whereInput,
      include: {
        statistic: {
          select: {
            article_count: true,
            comment_count: true,
            last_activity_at: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
    }),
    MyGlobal.prisma.discussion_board_sections.count({
      where: whereInput,
    }),
  ]);
  const data: IDiscussionBoardSection.ISummary[] = sections.map((section) => ({
    id: section.id as string & tags.Format<"uuid">,
    name: section.name,
    description: section.description,
    status: section.status,
    display_order: section.display_order,
    deleted_at: section.deleted_at
      ? (toISOStringSafe(section.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  }));
  // The pagination field must match IPageIDiscussionBoardSection.ISummary.pagination
  // Follow the type chain: IPageIDiscussionBoardSection.ISummary.pagination is IPageIDiscussionBoardSection.IPagination
  // IPageIDiscussionBoardSection.IPagination.pagination is IPageIDiscussionBoardAdministratorPromotionRequest.IPagination
  // which has pagination property of type IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination
  // which finally has pagination property of type IPage.IPagination
  // I need to construct the nested structure correctly.
  const pagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: {
      pagination: {
        pagination: {
          current: pageNum satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
          limit: limit satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
          records: total satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
          pages: Math.ceil(total / limit) satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IPage.IPagination,
        data: [] as IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      data: [] as IDiscussionBoardAdministratorPromotionRequest.IPagination[],
    } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
    data,
  };
  return pagination satisfies IPageIDiscussionBoardSection.ISummary;
}
