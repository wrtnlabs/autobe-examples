import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";
import { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorModeratorsUsernameSessions(props: {
  moderator: ModeratorPayload;
  username: string;
  body: IRedditCommunityModeratorSession.IRequest;
}): Promise<IPageIRedditCommunityModeratorSession.ISummary> {
  const targetModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  if (targetModerator.id !== props.moderator.id) {
    throw new HttpException(
      "You can only access your own session history",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    reddit_community_moderator_id: targetModerator.id,
  };

  if (props.body.ip) {
    whereCondition.ip = props.body.ip;
  }

  if (props.body.created_from || props.body.created_to) {
    const createdAtFilter: Record<string, unknown> = {};
    if (props.body.created_from) {
      createdAtFilter.gte = new Date(props.body.created_from);
    }
    if (props.body.created_to) {
      createdAtFilter.lte = new Date(props.body.created_to);
    }
    whereCondition.created_at = createdAtFilter;
  }

  if (props.body.search) {
    whereCondition.OR = [
      { ip: { contains: props.body.search } },
      { referrer: { contains: props.body.search } },
    ];
  }

  const orderByField = props.body.sort_by ?? "created_at";
  const orderByDirection = props.body.sort_order ?? "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderator_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderByDirection },
    }),
    MyGlobal.prisma.reddit_community_moderator_sessions.count({
      where: whereCondition,
    }),
  ]);

  const data: IRedditCommunityModeratorSession.ISummary[] = sessions.map(
    (session) => ({
      id: session.id,
      reddit_community_moderator_id: session.reddit_community_moderator_id,
      ip: session.ip,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    }),
  );

  return {
    pagination: {
      current: page - 1,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
