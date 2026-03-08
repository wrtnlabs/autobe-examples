import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardMemberSessionAtSummaryTransformer } from "../transformers/DiscussionBoardMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberSessions(props: {
  member: MemberPayload;
  body: IDiscussionBoardMemberSession.IRequest;
}): Promise<IPageIDiscussionBoardMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  // Build createdAt filter
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.created_from !== undefined || props.body.created_to !== undefined
      ? {
          ...(props.body.created_from !== undefined && {
            gte: new Date(props.body.created_from),
          }),
          ...(props.body.created_to !== undefined && {
            lte: new Date(props.body.created_to),
          }),
        }
      : undefined;
  // Build where clause
  const whereInput = {
    discussion_board_member_id: props.member.id,
    ...(props.body.status === "active" && {
      expired_at: { gt: now },
    }),
    ...(props.body.status === "expired" && {
      expired_at: { lte: now },
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(createdAtFilter !== undefined && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.discussion_board_member_sessionsWhereInput;
  // Query sessions
  const sessions =
    await MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardMemberSessionAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_member_sessions.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    sessions,
    DiscussionBoardMemberSessionAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardMemberSession.ISummary;
}
