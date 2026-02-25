import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardUserAtSummaryTransformer } from "../transformers/DiscussionBoardUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminUsersSearch(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUser.IRequest;
}): Promise<IPageIDiscussionBoardUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereFilter = {
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.displayName && {
      display_name: { contains: props.body.displayName, mode: "insensitive" },
    }),
    ...(props.body.bio && {
      bio: { contains: props.body.bio, mode: "insensitive" },
    }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.updatedAtFrom && {
      updated_at: { gte: new Date(props.body.updatedAtFrom) },
    }),
    ...(props.body.updatedAtTo && {
      updated_at: { lte: new Date(props.body.updatedAtTo) },
    }),
    ...(props.body.includeDeleted ? {} : { deleted_at: null }),
  } satisfies Prisma.discussion_board_usersWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_users.findMany({
      where: whereFilter,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardUserAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_users.count({
      where: whereFilter,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardUserAtSummaryTransformer.transform,
  );
  // Create the base pagination
  const basePagination: IPage.IPagination = {
    current: page satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0> as number,
    limit: limit satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0> as number,
    records: total satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0> as number,
    pages: Math.ceil(total / limit) satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0> as number,
  };
  // Create the nested pagination structure according to DTO definitions
  const adminDistPagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: basePagination,
      data: [],
    };
  const adminPromotionPagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: adminDistPagination,
      data: [],
    };
  const sectionPagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: adminPromotionPagination,
    data: [],
  };
  return {
    data: transformedData,
    pagination: sectionPagination,
  } satisfies IPageIDiscussionBoardUser.ISummary;
}
