import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import { IPageICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityForumAdministratorModerationActions(props: {
  administrator: AdministratorPayload;
  body: ICommunityForumCommunityModerationAction.IRequest;
}): Promise<IPageICommunityForumCommunityModerationAction.ISummary> {
  // Default pagination values (will be applied at the controller level based on IPage.IRequest)
  // Using fixed values since pagination isn't in the IRequest interface
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where: Prisma.community_forum_moderation_actionsWhereInput = {
    deleted_at: null,
  };

  // Add filter conditions
  if (props.body.community_forum_moderator_id) {
    where.community_forum_moderator_id =
      props.body.community_forum_moderator_id;
  }

  if (props.body.community_forum_report_id) {
    where.community_forum_report_id = props.body.community_forum_report_id;
  }

  if (props.body.community_forum_community_id) {
    where.community_forum_community_id =
      props.body.community_forum_community_id;
  }

  if (props.body.action_type) {
    where.action_type = props.body.action_type;
  }

  if (props.body.reason) {
    where.reason = {
      contains: props.body.reason,
      mode: "insensitive",
    };
  }

  // Handle created_at range filtering
  if (props.body.created_at_range) {
    where.created_at = {};
    if (props.body.created_at_range.from) {
      where.created_at.gte = props.body.created_at_range.from;
    }
    if (props.body.created_at_range.to) {
      where.created_at.lte = props.body.created_at_range.to;
    }
  }

  // Handle updated_at range filtering
  if (props.body.updated_at_range) {
    where.updated_at = {};
    if (props.body.updated_at_range.from) {
      where.updated_at.gte = props.body.updated_at_range.from;
    }
    if (props.body.updated_at_range.to) {
      where.updated_at.lte = props.body.updated_at_range.to;
    }
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_forum_moderation_actions.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.community_forum_moderation_actions.count({
      where,
    }),
  ]);

  // Transform results to match API response format
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
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
