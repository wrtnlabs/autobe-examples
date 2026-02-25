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

export async function patchRedditCloneAppealsAppealId(props: {
  appealId: string;
  body: IRedditCloneModerationAppeal.IUpdate;
}): Promise<IRedditCloneModerationAppeal> {
  // Find the appeal
  const appeal =
    await MyGlobal.prisma.reddit_clone_moderation_appeals.findFirstOrThrow({
      where: {
        id: props.appealId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        report_id: true,
        user_id: true,
        resolved_by_id: true,
        appeal_content: true,
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
  // Validate appeal is not already resolved
  if (appeal.status !== "pending") {
    throw new HttpException("Appeal has already been resolved", 400);
  }
  // Determine new status based on action
  const newStatus = props.body.action === "approve" ? "approved" : "denied";
  // Update the appeal with resolution information
  const updatedAppeal =
    await MyGlobal.prisma.reddit_clone_moderation_appeals.update({
      where: { id: props.appealId },
      data: {
        status: newStatus,
        decision_reason: props.body.decisionReason ?? null,
        resolved_by_id: appeal.user_id,
        resolved_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        appeal_content: true,
        status: true,
        decision_reason: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report_id: true,
        user_id: true,
        resolved_by_id: true,
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
  return await RedditCloneModerationAppealTransformer.transform(updatedAppeal);
}
