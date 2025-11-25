import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import { IPageICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityForumModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: ICommunityForumCommunityModerationAction.IRequest;
}): Promise<IPageICommunityForumCommunityModerationAction.ISummary> {
  const { body } = props;

  // Build where conditions
  const whereConditions: Prisma.community_forum_moderation_actionsWhereInput = {
    deleted_at: null,
  };

  // Apply filters
  if (body.community_forum_moderator_id) {
    whereConditions.community_forum_moderator_id =
      body.community_forum_moderator_id;
  }

  if (body.community_forum_report_id) {
    whereConditions.community_forum_report_id = body.community_forum_report_id;
  }

  if (body.community_forum_community_id) {
    whereConditions.community_forum_community_id =
      body.community_forum_community_id;
  }

  if (body.action_type) {
    whereConditions.action_type = body.action_type;
  }

  if (body.reason) {
    whereConditions.reason = {
      contains: body.reason,
      mode: "insensitive",
    };
  }

  if (body.created_at_range) {
    whereConditions.created_at = {};
    if (body.created_at_range.from) {
      whereConditions.created_at.gte = new Date(body.created_at_range.from);
    }
    if (body.created_at_range.to) {
      whereConditions.created_at.lte = new Date(body.created_at_range.to);
    }
  }

  if (body.updated_at_range) {
    whereConditions.updated_at = {};
    if (body.updated_at_range.from) {
      whereConditions.updated_at.gte = new Date(body.updated_at_range.from);
    }
    if (body.updated_at_range.to) {
      whereConditions.updated_at.lte = new Date(body.updated_at_range.to);
    }
  }

  // Handle pagination - using default values since IRequest doesn't contain page/limit
  // In a real implementation, these might come from query parameters
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Execute query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_forum_moderation_actions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.community_forum_moderation_actions.count({
      where: whereConditions,
    }),
  ]);

  // Transform data to match return type
  const transformedData = data.map((action) => ({
    id: action.id,
    community_forum_moderator_id: action.community_forum_moderator_id,
    community_forum_report_id: action.community_forum_report_id ?? undefined,
    community_forum_community_id: action.community_forum_community_id,
    action_type: action.action_type,
    reason: action.reason,
    details: action.details ?? undefined,
    created_at: toISOStringSafe(action.created_at),
    updated_at: toISOStringSafe(action.updated_at),
    deleted_at: action.deleted_at
      ? toISOStringSafe(action.deleted_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
