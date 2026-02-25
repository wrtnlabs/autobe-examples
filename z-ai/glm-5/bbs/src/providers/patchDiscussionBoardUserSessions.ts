import { IDiscussionBoardSessionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSessionStatus";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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

export async function patchDiscussionBoardUserSessions(props: {
  user: UserPayload;
  body: IDiscussionBoardUserSession.IRequest;
}): Promise<IPageIDiscussionBoardUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.discussion_board_user_id !== undefined && {
      discussion_board_user_id: props.body.discussion_board_user_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.expired_at_from !== undefined && {
      expired_at: { gte: new Date(props.body.expired_at_from) },
    }),
    ...(props.body.expired_at_to !== undefined && {
      expired_at: { lte: new Date(props.body.expired_at_to) },
    }),
  } satisfies Prisma.discussion_board_user_sessionsWhereInput;
  const orderByInput = (
    props.body.sort === "created_at-asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_user_sessionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.discussion_board_user_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardUserSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_user_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardUserSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
