import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserPasswordResetAtSummaryTransformer } from "../transformers/DiscussionBoardUserPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserUsersPasswordResets(props: {
  user: UserPayload;
  body: IDiscussionBoardUserPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardUserPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get current timestamp as ISO string using safe function
  const now = toISOStringSafe(new Date());
  // Build WHERE clause with all optional filters
  const whereInput = {
    deleted_at: null,
    ...(props.body.email && {
      user: {
        email: {
          contains: props.body.email,
          mode: "insensitive" as const,
        },
      } satisfies Prisma.discussion_board_usersWhereInput,
    }),
    ...(props.body.used !== undefined &&
      props.body.used !== null && {
        used_at: props.body.used ? { not: null } : null,
      }),
    ...(props.body.expired !== undefined &&
      props.body.expired !== null && {
        expired_at: props.body.expired ? { lt: now } : { gte: now },
      }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.expired_at_start && {
      expired_at: { gte: props.body.expired_at_start },
    }),
    ...(props.body.expired_at_end && {
      expired_at: { lte: props.body.expired_at_end },
    }),
  } satisfies Prisma.discussion_board_user_password_resetsWhereInput;
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardUserPasswordResetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_user_password_resets.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardUserPasswordResetAtSummaryTransformer.transform,
  );
  // Create pagination object with proper type handling
  const pagination: IPage.IPagination = {
    current: page satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    limit: limit satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    records: total satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    pages: Math.ceil(total / limit) satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
  // Create the correct nested structure according to DTO
  const result: IPageIDiscussionBoardUserPasswordReset.ISummary = {
    data: transformedData,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            limit: limit satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            records: total satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            pages: Math.ceil(total / limit) satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
          } satisfies IPage.IPagination,
          data: [] as IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [] as IDiscussionBoardAdministratorPromotionRequest.IPagination[],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [] as IDiscussionBoardSection.IPagination[],
    } satisfies IPageIDiscussionBoardSection.IPagination,
  };
  return result;
}
