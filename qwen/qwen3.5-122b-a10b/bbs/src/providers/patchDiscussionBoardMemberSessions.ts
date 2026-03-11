import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardGuestSessionAtSummaryTransformer } from "../transformers/DiscussionBoardGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberSessions(props: {
  member: MemberPayload;
  body: IDiscussionBoardGuestSession.IRequest;
}): Promise<IPageIDiscussionBoardGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 30;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_guest_sessionsWhereInput = {
    ...(props.body.userId && {
      discussion_board_guest_id: props.body.userId,
    }),
    ...(props.body.sessionId && {
      id: props.body.sessionId,
    }),
    ...(props.body.ipAddress && {
      ip: props.body.ipAddress,
    }),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.expiredAtFrom || props.body.expiredAtTo
      ? {
          expired_at: {
            ...(props.body.expiredAtFrom && {
              gte: new Date(props.body.expiredAtFrom),
            }),
            ...(props.body.expiredAtTo && {
              lte: new Date(props.body.expiredAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.discussion_board_guest_sessionsWhereInput;
  const orderByInput: Prisma.discussion_board_guest_sessionsOrderByWithRelationInput =
    props.body.orderBy
      ? ({
          [props.body.orderBy]:
            props.body.orderByDesc === false ? "asc" : "desc",
        } satisfies Prisma.discussion_board_guest_sessionsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.discussion_board_guest_sessionsOrderByWithRelationInput);
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guest_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardGuestSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_guest_sessions.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardGuestSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIDiscussionBoardGuestSession.ISummary;
}
