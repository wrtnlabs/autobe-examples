import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardGuestSessionAtSummaryTransformer } from "../transformers/DiscussionBoardGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAnalyticsSessions(props: {
  admin: AdminPayload;
  body: IDiscussionBoardGuestSession.IRequest;
}): Promise<IPageIDiscussionBoardGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate date range if both provided
  if (
    props.body.startDate &&
    props.body.endDate &&
    props.body.startDate > props.body.endDate
  ) {
    throw new HttpException("startDate must be before endDate", 400);
  }
  // Build where clause for filtering
  const whereInput: Prisma.discussion_board_guest_sessionsWhereInput = {};
  if (props.body.startDate || props.body.endDate) {
    whereInput.created_at = {};
    if (props.body.startDate) {
      whereInput.created_at.gte = props.body.startDate;
    }
    if (props.body.endDate) {
      whereInput.created_at.lte = props.body.endDate;
    }
  }
  // Query guest sessions with filtering
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guest_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        guest: {
          select: {
            id: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_guest_sessions.count({
      where: whereInput,
    }),
  ]);
  // Transform to response format using the existing transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardGuestSessionAtSummaryTransformer.transform,
  );
  // Apply duration filtering in memory after transformation
  const filteredData = transformedData.filter((session) => {
    const sessionDate = new Date(session.created_at);
    const expiredDate = new Date(session.expired_at);
    const duration = Math.floor(
      (expiredDate.getTime() - sessionDate.getTime()) / 1000,
    );
    if (
      props.body.minDuration !== undefined &&
      duration < props.body.minDuration
    ) {
      return false;
    }
    if (
      props.body.maxDuration !== undefined &&
      duration > props.body.maxDuration
    ) {
      return false;
    }
    return true;
  });
  return {
    data: filteredData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
