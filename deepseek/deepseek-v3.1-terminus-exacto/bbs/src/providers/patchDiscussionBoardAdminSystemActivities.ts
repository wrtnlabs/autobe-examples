import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemActivityAtSummaryTransformer } from "../transformers/DiscussionBoardSystemActivityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSystemActivities(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IPageIDiscussionBoardSystemActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput: Prisma.discussion_board_system_activitiesWhereInput = {
    ...(props.body.start_date && {
      created_at: {
        gte: props.body.start_date, // Prisma handles ISO string comparisons
      },
    }),
    ...(props.body.end_date && {
      created_at: {
        lte: props.body.end_date, // Prisma handles ISO string comparisons
      },
    }),
    ...(props.body.activity_type && {
      activity_type: {
        contains: props.body.activity_type,
        mode: "insensitive" as const,
      },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_activities.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardSystemActivityAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_system_activities.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemActivityAtSummaryTransformer.transform,
  );
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
