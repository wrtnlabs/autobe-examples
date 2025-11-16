import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { IPageIDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModeratorsModeratorIdSessions(props: {
  moderator: ModeratorPayload;
  moderatorId: string;
  body: IDiscussionBoardModeratorSession.IRequest;
}): Promise<IPageIDiscussionBoardModeratorSession.ISummary> {
  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: { id: props.moderatorId },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException("You can only access your own sessions", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const orderBy: Prisma.discussion_board_moderator_sessionsOrderByWithRelationInput =
    (() => {
      if (props.body.sort === "created_at") {
        return { created_at: "asc" };
      } else if (props.body.sort === "-created_at") {
        return { created_at: "desc" };
      }
      return { created_at: "desc" };
    })();

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderator_sessions.findMany({
      where: {
        discussion_board_moderator_id: props.moderatorId,
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_moderator_sessions.count({
      where: {
        discussion_board_moderator_id: props.moderatorId,
      },
    }),
  ]);

  const data: IDiscussionBoardModeratorSession.ISummary[] = sessions.map(
    (session) => ({
      id: session.id as string & tags.Format<"uuid">,
      discussion_board_moderator_id:
        session.discussion_board_moderator_id as string & tags.Format<"uuid">,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    }),
  );

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
    data,
  };
}
