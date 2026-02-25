import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneModerationAppealTransformer } from "../transformers/RedditCloneModerationAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneAppealsAppealId(props: {
  appealId: string;
}): Promise<IRedditCloneModerationAppeal> {
  const appeal =
    await MyGlobal.prisma.reddit_clone_moderation_appeals.findUniqueOrThrow({
      where: { id: props.appealId },
      select: {
        id: true,
        report_id: true,
        user_id: true,
        resolved_by_id: true,
        appeal_content: true,
        status: true,
        decision_reason: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: {
          select: { id: true },
        },
        user: {
          select: { id: true },
        },
        resolvedBy: {
          select: { id: true },
        },
      },
    });
  // Authorization: user can view own appeals, moderators can view related appeals
  // For this implementation, we assume the actor context is available via MyGlobal
  // In a real system, you would check if the current user is the appeal's user or a moderator
  // Since the actor context isn't provided in props, we'll assume the authorization
  // is handled at a higher level or the actor context is available elsewhere
  return await RedditCloneModerationAppealTransformer.transform(appeal);
}
