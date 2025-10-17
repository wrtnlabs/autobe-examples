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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditLikeAdminModerationActions(props: {
  admin: AdminPayload;
  body: IRedditLikeModerationAction.IRequest;
}): Promise<IPageIRedditLikeModerationAction> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.action_type !== undefined && {
      action_type: body.action_type,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.community_id !== undefined && {
      community_id: body.community_id,
    }),
  };

  const [actions, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderation_actions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_moderation_actions.count({
      where,
    }),
  ]);

  const data: IRedditLikeModerationAction[] = actions.map((action) => ({
    id: action.id as string & tags.Format<"uuid">,
    action_type: action.action_type,
    content_type: action.content_type,
    removal_type: action.removal_type ?? undefined,
    reason_category: action.reason_category,
    reason_text: action.reason_text,
    status: action.status,
    created_at: toISOStringSafe(action.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
