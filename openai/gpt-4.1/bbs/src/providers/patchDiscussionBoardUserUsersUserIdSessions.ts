import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchDiscussionBoardUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserSession.IRequest;
}): Promise<IPageIDiscussionBoardUserSession.ISummary> {
  // Authorization: user can only access their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Cannot access another user's sessions",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";

  const where: Record<string, any> = { discussion_board_user_id: props.userId };
  if (
    props.body.ip_filter !== undefined &&
    props.body.ip_filter !== null &&
    props.body.ip_filter.length > 0
  ) {
    where.ip = { contains: props.body.ip_filter };
  }
  if (props.body.active_only === true) {
    where.expired_at = null;
  }
  if (props.body.from_date !== undefined && props.body.from_date !== null) {
    where.created_at = {
      ...(where.created_at ?? {}),
      gte: props.body.from_date,
    };
  }
  if (props.body.to_date !== undefined && props.body.to_date !== null) {
    where.created_at = {
      ...(where.created_at ?? {}),
      lte: props.body.to_date,
    };
  }

  const skip = (page - 1) * limit;
  const take = limit;

  let orderField: "created_at" | "expired_at" | "ip" = "created_at";
  if (sort_by === "expired_at") orderField = "expired_at";
  else if (sort_by === "ip") orderField = "ip";
  const orderDirection: "asc" | "desc" = sort_order === "asc" ? "asc" : "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_sessions.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take,
    }),
    MyGlobal.prisma.discussion_board_user_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      discussion_board_user_id: session.discussion_board_user_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
