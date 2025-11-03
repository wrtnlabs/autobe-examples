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

export async function patchRedditCommunityModeratorModeratorsModeratorIdActions(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerationAction.IRequest;
}): Promise<IPageIRedditCommunityModerationAction.ISummary> {
  const { moderator, moderatorId, body } = props;

  if (moderator.id !== moderatorId) {
    throw new HttpException(
      "Forbidden: Cannot access other moderators' actions",
      403,
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const sortBy = body.sortBy ?? "created_at";
  const order = body.order ?? "desc";

  const where: {
    moderator_id: string & tags.Format<"uuid">;
    action_type?: string;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    moderator_id: moderatorId,
  };

  if (body.filter?.actionType !== undefined) {
    where.action_type = body.filter.actionType;
  }

  if (
    body.filter?.createdAfter !== undefined ||
    body.filter?.createdBefore !== undefined
  ) {
    where.created_at = {};
    if (body.filter.createdAfter !== undefined) {
      where.created_at.gte = body.filter.createdAfter;
    }
    if (body.filter.createdBefore !== undefined) {
      where.created_at.lte = body.filter.createdBefore;
    }
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderation_actions.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_moderation_actions.count({ where }),
  ]);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: results.map((item) => ({
      id: item.id,
      moderator_id: item.moderator_id,
      content_report_id: item.content_report_id,
      action_type: item.action_type,
      action_notes: item.action_notes ?? undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
