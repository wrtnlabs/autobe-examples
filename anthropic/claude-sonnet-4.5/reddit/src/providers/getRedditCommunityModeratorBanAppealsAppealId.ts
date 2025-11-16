import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorBanAppealsAppealId(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityBanAppeal> {
  const appeal = await MyGlobal.prisma.reddit_community_ban_appeals.findUnique({
    where: {
      id: props.appealId,
    },
    include: {
      ban: {
        include: {
          community: true,
        },
      },
    },
  });

  if (!appeal || appeal.deleted_at !== null) {
    throw new HttpException("Ban appeal not found", 404);
  }

  const isModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: appeal.ban.reddit_community_community_id,
      },
    });

  if (!isModerator) {
    throw new HttpException(
      "You do not have authority to view appeals for this community",
      403,
    );
  }

  return {
    id: appeal.id,
    reddit_community_community_ban_id: appeal.reddit_community_community_ban_id,
    appeal_text: appeal.appeal_text,
    status: typia.assert<
      "pending" | "approved" | "denied" | "expired_no_review"
    >(appeal.status),
    moderator_response: appeal.moderator_response,
    reddit_community_moderator_id: appeal.reddit_community_moderator_id,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    deleted_at: appeal.deleted_at ? toISOStringSafe(appeal.deleted_at) : null,
  };
}
