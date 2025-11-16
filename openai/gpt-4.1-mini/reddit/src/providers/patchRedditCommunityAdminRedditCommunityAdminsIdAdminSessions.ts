import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import { IPageIRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityAdminsIdAdminSessions(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.IRequest;
}): Promise<IPageIRedditCommunityAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.reddit_community_admin_sessionsWhereInput = {
    reddit_community_admin_id: props.id,
  };

  if (props.body.search) {
    where.OR = [{ ip: { contains: props.body.search } }];
  }

  const orderByField =
    props.body.orderBy === "createdAt" ? "created_at" : "updated_at";
  const orderDirection = props.body.orderDirection ?? "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_admin_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDirection },
      select: {
        id: true,
        reddit_community_admin_id: true,
      },
    }),
    MyGlobal.prisma.reddit_community_admin_sessions.count({ where }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      reddit_community_admin_id: session.reddit_community_admin_id,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
