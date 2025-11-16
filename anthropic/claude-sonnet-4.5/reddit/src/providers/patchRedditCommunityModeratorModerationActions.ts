import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityModerationAction.IRequest;
}): Promise<IPageIRedditCommunityModerationAction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {
    ...(props.body.moderator_id !== undefined &&
      props.body.moderator_id !== null && {
        reddit_community_moderator_id: props.body.moderator_id,
      }),
    ...(props.body.community_id !== undefined &&
      props.body.community_id !== null && {
        reddit_community_community_id: props.body.community_id,
      }),
    ...(props.body.action_type !== undefined &&
      props.body.action_type !== null && {
        action_type: props.body.action_type,
      }),
    ...(props.body.target_type !== undefined &&
      props.body.target_type !== null && {
        OR: [
          { target_content_type: props.body.target_type },
          ...(props.body.target_type === "user"
            ? [{ target_member_id: { not: null } }]
            : []),
        ],
      }),
    ...((props.body.from_date || props.body.to_date) && {
      created_at: {
        ...(props.body.from_date && { gte: new Date(props.body.from_date) }),
        ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
      },
    }),
    ...(props.body.search_query !== undefined &&
      props.body.search_query !== null && {
        reason: {
          contains: props.body.search_query,
        },
      }),
  };

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const orderByMapping: Record<string, string> = {
    created_at: "created_at",
    moderator: "reddit_community_moderator_id",
    community: "reddit_community_community_id",
    action_type: "action_type",
  };

  const orderByField = orderByMapping[sortBy] ?? "created_at";
  const orderByClause = { [orderByField]: order };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderation_actions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderByClause,
    }),
    MyGlobal.prisma.reddit_community_moderation_actions.count({
      where: whereConditions,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page - 1,
      limit,
      records: total,
      pages: totalPages,
    },
    data: data.map((action) => {
      const targetEntityType =
        action.target_member_id !== null
          ? "user"
          : (action.target_content_type ?? "post");
      const targetEntityId = (action.target_member_id ??
        action.target_content_id ??
        action.id) as string & tags.Format<"uuid">;

      return {
        id: action.id,
        reddit_community_moderator_id: action.reddit_community_moderator_id,
        action_type: action.action_type,
        target_entity_type: targetEntityType,
        target_entity_id: targetEntityId,
        reason: action.reason ?? undefined,
        created_at: toISOStringSafe(action.created_at),
      };
    }),
  };
}
