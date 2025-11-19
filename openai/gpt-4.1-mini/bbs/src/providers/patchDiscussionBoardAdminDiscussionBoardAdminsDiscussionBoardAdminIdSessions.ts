import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminIdSessions(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  if (page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  const limit = props.body.limit ?? 20;
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;

  const where: any = {
    discussion_board_admin_id: props.discussionBoardAdminId,
  };

  if (props.body.search) {
    where.OR = [
      { ip: { contains: props.body.search } },
      { href: { contains: props.body.search } },
      { referrer: { contains: props.body.search } },
    ];
  }

  if (props.body.startDate || props.body.endDate) {
    where.created_at = {};
    if (props.body.startDate) {
      where.created_at.gte = props.body.startDate;
    }
    if (props.body.endDate) {
      where.created_at.lte = props.body.endDate;
    }
  }

  const orderByField = props.body.sortBy ?? "created_at";
  const orderByDirection = props.body.sortOrder ?? "desc";
  const orderBy: any = {};
  orderBy[orderByField] = orderByDirection;

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_admin_sessions.count({ where }),
  ]);

  // Map each session to ISummary type, which is { [key:string]: false; }, so we must comply exactly.
  const data: IDiscussionBoardAdminSession.ISummary[] = sessions.map(
    () => ({}),
  );

  return {
    data,
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
    },
  };
}
