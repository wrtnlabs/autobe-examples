import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationActionOfPost";
import { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityModeratorModerationActions(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityModerationActionOfPost.IRequest;
}): Promise<IPageIRedditCommunityModerationActionOfPost.ISummary> {
  const { limit, cursor } = props.body;
  // Parse cursor to get last created_at and id for cursor-based pagination
  let cursorInfo: {
    created_at: string;
    id: string;
  } | null = null;
  if (cursor) {
    try {
      cursorInfo = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
    } catch {
      throw new HttpException("Invalid cursor", 400);
    }
  }
  // Build WHERE clause with filters
  const where: Prisma.reddit_community_moderation_actionsWhereInput = {
    actor_id: props.body.actor_id,
    target_type: props.body.target_type,
    action_type: props.body.action_type,
    created_at:
      {} as Prisma.DateTimeFilter<"reddit_community_moderation_actions">,
  };
  // Filter by date range if provided
  if (props.body.created_at_after) {
    (
      where.created_at as Prisma.DateTimeFilter<"reddit_community_moderation_actions">
    ).gte = props.body.created_at_after;
  }
  if (props.body.created_at_before) {
    (
      where.created_at as Prisma.DateTimeFilter<"reddit_community_moderation_actions">
    ).lte = props.body.created_at_before;
  }
  if (cursorInfo) {
    // Cursor-based pagination: after (created_at, id)
    where.OR = [
      { created_at: { lt: cursorInfo.created_at } },
      {
        created_at: { lte: cursorInfo.created_at },
        id: { gt: cursorInfo.id },
      },
    ];
  }
  // Fetch data with limit
  const data =
    await MyGlobal.prisma.reddit_community_moderation_actions.findMany({
      where,
      take: limit,
      orderBy: { created_at: "desc" as const, id: "desc" as const },
      select: {
        id: true,
        action_type: true,
        reason: true,
        created_at: true,
        actor_id: true,
        target_type: true,
      },
    });
  // Find associated actor_display_name by joining with reddit_community_member_sessions
  const actorIds = [...new Set(data.map((item) => item.actor_id))];
  const actorSessions =
    await MyGlobal.prisma.reddit_community_member_sessions.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, member: { select: { display_name: true } } },
    });
  const actorDisplayNameMap = new Map<string, string>();
  for (const session of actorSessions) {
    if (session.member) {
      actorDisplayNameMap.set(session.id, session.member.display_name);
    }
  }
  // Transform into summary format
  const summary: IRedditCommunityModerationActionOfPost.ISummary[] = data.map(
    (item) => {
      const postId =
        item.target_type === "post"
          ? (item.id as string satisfies string as string & tags.Format<"uuid">)
          : ("00000000-0000-0000-0000-000000000000" satisfies string as string &
              tags.Format<"uuid">);
      return {
        action_type:
          item.action_type as IRedditCommunityModerationActionOfPost.ISummary["action_type"],
        reason: item.reason,
        created_at: toISOStringSafe(item.created_at) as string &
          tags.Format<"date-time">,
        actor_display_name: actorDisplayNameMap.get(item.actor_id) || "",
        post_id: postId,
      };
    },
  );
  // Create cursor for next page
  const nextCursor =
    data.length === limit
      ? Buffer.from(
          JSON.stringify({
            created_at: data[data.length - 1].created_at,
            id: data[data.length - 1].id,
          }),
        ).toString("base64")
      : null;
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_moderation_actions.count(
    { where },
  );
  return {
    data: summary,
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
