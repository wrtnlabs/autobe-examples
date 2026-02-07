import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorKarmaHistoriesHistoryId(props: {
  moderator: ModeratorPayload;
  historyId: string;
}): Promise<IRedditPlatformKarmaHistory> {
  const history =
    await MyGlobal.prisma.reddit_platform_karma_histories.findUnique({
      where: { id: props.historyId },
      select: {
        id: true,
        reddit_platform_user_id: true,
        target_content_id: true,
        affected_by_user_id: true,
        change_type: true,
        amount: true,
        balance_after: true,
        vote_direction: true,
        note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
            updated_at: true,
          },
        },
        targetContent: {
          select: {
            id: true,
            author_id: true,
            community_id: true,
            created_at: true,
            deleted_at: true,
            comment_count: true,
            content_text: true,
            updated_at: true,
            url: true,
            image_url: true,
            type: true,
            title: true,
            vote_score: true,
          },
        },
        affectedByUser: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  if (!history) {
    throw new HttpException("Karma history not found", 404);
  }
  return {
    id: history.id,
    reddit_platform_user_id: history.reddit_platform_user_id,
    target_content_id: history.target_content_id,
    affected_by_user_id: history.affected_by_user_id,
    change_type: history.change_type,
    amount: history.amount,
    balance_after: history.balance_after,
    vote_direction: history.vote_direction,
    note: history.note,
    created_at: toISOStringSafe(history.created_at),
    updated_at: toISOStringSafe(history.updated_at),
    deleted_at: history.deleted_at ? toISOStringSafe(history.deleted_at) : null,
  };
}
