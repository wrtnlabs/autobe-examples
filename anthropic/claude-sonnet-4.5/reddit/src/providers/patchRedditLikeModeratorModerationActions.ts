import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import { IPageIRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditLikeModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeModerationAction.IRequest;
}): Promise<IPageIRedditLikeModerationAction> {
  const { moderator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const moderatorCommunities =
    await MyGlobal.prisma.reddit_like_community_moderators.findMany({
      where: {
        moderator_id: moderator.id,
      },
      select: {
        community_id: true,
      },
    });

  const allowedCommunityIds = moderatorCommunities.map((mc) => mc.community_id);

  if (allowedCommunityIds.length === 0) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  if (body.community_id !== undefined && body.community_id !== null) {
    if (!allowedCommunityIds.includes(body.community_id)) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  const [actions, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderation_actions.findMany({
      where: {
        community_id:
          body.community_id !== undefined && body.community_id !== null
            ? body.community_id
            : { in: allowedCommunityIds },
        ...(body.action_type !== undefined &&
          body.action_type !== null && {
            action_type: body.action_type,
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
      },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_moderation_actions.count({
      where: {
        community_id:
          body.community_id !== undefined && body.community_id !== null
            ? body.community_id
            : { in: allowedCommunityIds },
        ...(body.action_type !== undefined &&
          body.action_type !== null && {
            action_type: body.action_type,
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
      },
    }),
  ]);

  const data: IRedditLikeModerationAction[] = actions.map((action) => ({
    id: action.id,
    action_type: action.action_type,
    content_type: action.content_type,
    removal_type:
      action.removal_type === null ? undefined : action.removal_type,
    reason_category: action.reason_category,
    reason_text: action.reason_text,
    status: action.status,
    created_at: toISOStringSafe(action.created_at),
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: data,
  };
}
