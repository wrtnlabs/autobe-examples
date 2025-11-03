import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getAuthModeratorSessions(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardModerator.ISessionsPage> {
  const { moderator } = props;

  // Default pagination
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const skip = (page - 1) * limit;

  // Only sessions owned by the authenticated moderator
  const where = {
    discussion_board_moderator_id: moderator.id,
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderator_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_moderator_sessions.count({ where }),
  ]);

  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    moderatorId: r.discussion_board_moderator_id as string &
      tags.Format<"uuid">,
    ip: r.ip ?? null,
    href: r.href as string & tags.Format<"uri">,
    referrer: r.referrer as string & tags.Format<"uri">,
    createdAt: toISOStringSafe(r.created_at),
    expiredAt: r.expired_at ? toISOStringSafe(r.expired_at) : null,
  })) satisfies IDiscussionBoardModerator.ISession[];

  return {
    pagination: {
      current: page,
      limit,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(Number(total) / Number(limit)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
