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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUsers(props: {
  body: IDiscussionBoardUser.IRequest;
}): Promise<IPageIDiscussionBoardUser.ISummary> {
  const { body } = props;
  // Set default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling and typia validation
  const whereConditions: Prisma.discussion_board_usersWhereInput = {
    ...(body.email && { email: { contains: body.email, mode: "insensitive" } }),
    ...(body.displayName && {
      display_name: { contains: body.displayName, mode: "insensitive" },
    }),
    ...(body.bio && { bio: { contains: body.bio, mode: "insensitive" } }),
    ...(body.createdAtFrom && {
      created_at: {
        gte: new Date(
          typia.assert<string & tags.Format<"date-time">>(body.createdAtFrom),
        ),
      },
    }),
    ...(body.createdAtTo && {
      created_at: {
        lte: new Date(
          typia.assert<string & tags.Format<"date-time">>(body.createdAtTo),
        ),
      },
    }),
    ...(body.updatedAtFrom && {
      updated_at: {
        gte: new Date(
          typia.assert<string & tags.Format<"date-time">>(body.updatedAtFrom),
        ),
      },
    }),
    ...(body.updatedAtTo && {
      updated_at: {
        lte: new Date(
          typia.assert<string & tags.Format<"date-time">>(body.updatedAtTo),
        ),
      },
    }),
    ...(body.includeDeleted !== true && { deleted_at: null }),
  };
  // Execute queries sequentially (not Promise.all as prohibited)
  const data = await MyGlobal.prisma.discussion_board_users.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      display_name: true,
      bio: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_users.count({
    where: whereConditions,
  });
  // Transform data with proper type branding
  const transformedData = data.map(
    (user) =>
      ({
        id: typia.assert<string & tags.Format<"uuid">>(user.id),
        display_name: user.display_name,
        bio: user.bio ?? null,
        created_at: toISOStringSafe(user.created_at),
      }) satisfies IDiscussionBoardUser.ISummary,
  );
  // Build pagination structure according to DTO definitions with multi-level nesting
  const corePagination: IPage.IPagination = {
    current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(page),
    limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(limit),
    records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(total),
    pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      Math.ceil(total / limit),
    ),
  };
  // Create the complex nested structure required by the DTO types
  const adminDistributionPagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: corePagination,
      data: [],
    };
  const adminPromotionPagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: adminDistributionPagination,
      data: [],
    };
  const sectionPagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: adminPromotionPagination,
    data: [],
  };
  // Return the properly structured response
  return {
    pagination: sectionPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardUser.ISummary;
}
