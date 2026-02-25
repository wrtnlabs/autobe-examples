import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserSessionAtSummaryTransformer } from "../transformers/DiscussionBoardUserSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserUsersSessions(props: {
  user: UserPayload;
  body: IDiscussionBoardUserSession.IRequest;
}): Promise<IPageIDiscussionBoardUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Enforce user access control - users can only search their own sessions
  if (
    props.body.user_id !== undefined &&
    props.body.user_id !== null &&
    props.body.user_id !== props.user.id
  ) {
    throw new HttpException(
      "Forbidden: You can only search your own sessions",
      403,
    );
  }
  // Build WHERE clause with mandatory user scope
  const whereInput: Prisma.discussion_board_user_sessionsWhereInput = {
    discussion_board_user_id: props.user.id,
  } satisfies Prisma.discussion_board_user_sessionsWhereInput;
  // Apply optional filters
  if (props.body.ip !== undefined) {
    whereInput.ip = props.body.ip;
  }
  if (props.body.active !== undefined) {
    const now = new Date();
    if (props.body.active) {
      whereInput.expired_at = { gt: now };
    } else {
      whereInput.expired_at = { lte: now };
    }
  }
  // Handle created_at date range filtering
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.created_at_min !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_at_min);
  }
  if (props.body.created_at_max !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_at_max);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  // Execute paginated query with transformer selection
  const data = await MyGlobal.prisma.discussion_board_user_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...DiscussionBoardUserSessionAtSummaryTransformer.select(),
  });
  // Count total matching records for pagination metadata
  const total = await MyGlobal.prisma.discussion_board_user_sessions.count({
    where: whereInput,
  });
  // Transform database results to DTO format
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardUserSessionAtSummaryTransformer.transform,
  );
  // Construct paginated response - Use correct type for IPage.IPagination
  const pagination = {
    current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: Math.ceil(total / limit) satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  } satisfies IPage.IPagination;
  const result: IPageIDiscussionBoardUserSession.ISummary = {
    data: transformedData,
    pagination,
  };
  return result;
}
