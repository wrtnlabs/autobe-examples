import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorModeratorsUsernameActivity(props: {
  moderator: ModeratorPayload;
  username: string;
  body: IRedditCommunityCommunityModerator.IActivityRequest;
}): Promise<IPageIRedditCommunityModerationAction.ISummary> {
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

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition = {
    reddit_community_moderator_id: targetModerator.id,
    ...(props.body.start_date || props.body.end_date
      ? {
          created_at: {
            ...(props.body.start_date && {
              gte: new Date(props.body.start_date),
            }),
            ...(props.body.end_date && { lte: new Date(props.body.end_date) }),
          },
        }
      : {}),
    ...(props.body.action_types && props.body.action_types.length > 0
      ? { action_type: { in: props.body.action_types } }
      : {}),
    ...(props.body.community_id
      ? { reddit_community_community_id: props.body.community_id }
      : {}),
    ...(props.body.search
      ? {
          OR: [
            { reason: { contains: props.body.search } },
            { action_type: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const buildOrderBy = () => {
    const order = props.body.order ?? "desc";

    if (!props.body.sort_by || props.body.sort_by === "action_timestamp") {
      return { created_at: order };
    }

    if (props.body.sort_by === "community") {
      return { reddit_community_community_id: order };
    }

    if (props.body.sort_by === "action_type") {
      return { action_type: order };
    }

    return { created_at: order };
  };

  const orderBy = buildOrderBy();

  const [actions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderation_actions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_moderation_actions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page - 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: actions.map((action) => ({
      id: action.id,
      reddit_community_moderator_id: action.reddit_community_moderator_id,
      action_type: action.action_type,
      target_entity_type: (action.target_content_type ??
        "member") satisfies string as string,
      target_entity_id: (action.target_content_id ??
        action.target_member_id ??
        "") satisfies string as string,
      reason: action.reason ?? undefined,
      created_at: toISOStringSafe(action.created_at),
    })),
  };
}
