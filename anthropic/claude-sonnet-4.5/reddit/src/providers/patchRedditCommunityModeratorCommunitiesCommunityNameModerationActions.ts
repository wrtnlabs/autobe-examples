import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchRedditCommunityModeratorCommunitiesCommunityNameModerationActions(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityModerationAction.IRequest;
}): Promise<IPageIRedditCommunityModerationAction.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: community.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException("You are not a moderator of this community", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {
    reddit_community_community_id: community.id,
  };

  if (
    props.body.moderator_id !== undefined &&
    props.body.moderator_id !== null
  ) {
    whereConditions.reddit_community_moderator_id = props.body.moderator_id;
  }

  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    whereConditions.action_type = props.body.action_type;
  }

  if (props.body.target_type !== undefined && props.body.target_type !== null) {
    whereConditions.target_content_type = props.body.target_type;
  }

  if (props.body.from_date !== undefined && props.body.from_date !== null) {
    whereConditions.created_at = {
      ...(typeof whereConditions.created_at === "object"
        ? whereConditions.created_at
        : {}),
      gte: new Date(props.body.from_date),
    };
  }

  if (props.body.to_date !== undefined && props.body.to_date !== null) {
    whereConditions.created_at = {
      ...(typeof whereConditions.created_at === "object"
        ? whereConditions.created_at
        : {}),
      lte: new Date(props.body.to_date),
    };
  }

  if (
    props.body.search_query !== undefined &&
    props.body.search_query !== null
  ) {
    whereConditions.reason = {
      contains: props.body.search_query,
    };
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  let orderBy: Record<string, string> = {};

  if (sortBy === "created_at") {
    orderBy = { created_at: order };
  } else if (sortBy === "moderator") {
    orderBy = { reddit_community_moderator_id: order };
  } else if (sortBy === "community") {
    orderBy = { reddit_community_community_id: order };
  } else if (sortBy === "action_type") {
    orderBy = { action_type: order };
  } else {
    orderBy = { created_at: "desc" };
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderation_actions.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_moderation_actions.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: page - 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((action) => ({
      id: action.id,
      reddit_community_moderator_id: action.reddit_community_moderator_id,
      action_type: action.action_type,
      target_entity_type: action.target_content_type ?? "",
      target_entity_id:
        action.target_content_id ?? action.target_member_id ?? "",
      reason: action.reason === null ? undefined : action.reason,
      created_at: toISOStringSafe(action.created_at),
    })),
  };
}
