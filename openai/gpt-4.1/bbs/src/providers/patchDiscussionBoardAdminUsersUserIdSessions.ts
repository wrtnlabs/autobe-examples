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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminUsersUserIdSessions(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserSession.IRequest;
}): Promise<IPageIDiscussionBoardUserSession.ISummary> {
  // Step 1: Confirm user exists
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.userId, deleted_at: null },
  });
  if (!user) throw new HttpException("User not found or deleted", 404);

  // Step 2: Build pagination params (use safe defaults)
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = (page - 1) * limit;

  // Step 3: Build where condition
  const where: Record<string, unknown> = {
    discussion_board_user_id: props.userId,
    ...(props.body.ip_filter ? { ip: { contains: props.body.ip_filter } } : {}),
    ...(props.body.active_only === true ? { expired_at: null } : {}),
    ...(props.body.from_date || props.body.to_date
      ? {
          created_at: {
            ...(props.body.from_date ? { gte: props.body.from_date } : {}),
            ...(props.body.to_date ? { lte: props.body.to_date } : {}),
          },
        }
      : {}),
  };

  // Step 4: Sorting
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const orderBy = { [sort_by]: sort_order };

  // Step 5: Query sessions and count concurrently
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_sessions.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_user_sessions.count({ where }),
  ]);

  // Step 6: Map session records to DTO
  const data = sessions.map(
    (s): IDiscussionBoardUserSession.ISummary => ({
      id: s.id,
      discussion_board_user_id: s.discussion_board_user_id,
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      created_at: toISOStringSafe(s.created_at),
      expired_at: s.expired_at ? toISOStringSafe(s.expired_at) : null,
    }),
  );

  // Step 7: Pagination object
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
