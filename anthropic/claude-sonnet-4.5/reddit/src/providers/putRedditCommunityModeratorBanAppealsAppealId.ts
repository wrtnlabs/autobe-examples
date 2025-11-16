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

export async function putRedditCommunityModeratorBanAppealsAppealId(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
  body: IRedditCommunityBanAppeal.IUpdate;
}): Promise<IRedditCommunityBanAppeal> {
  const appeal = await MyGlobal.prisma.reddit_community_ban_appeals.findUnique({
    where: { id: props.appealId },
    include: {
      ban: {
        include: {
          community: true,
        },
      },
    },
  });

  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }

  if (appeal.deleted_at !== null) {
    throw new HttpException("Ban appeal has been deleted", 404);
  }

  if (appeal.status !== "pending") {
    throw new HttpException(
      "This ban appeal has already been reviewed and cannot be modified",
      400,
    );
  }

  if (appeal.ban.deleted_at !== null) {
    throw new HttpException("The associated ban has been deleted", 404);
  }

  const communityModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: appeal.ban.reddit_community_community_id,
      },
    });

  if (!communityModerator) {
    throw new HttpException(
      "You do not have moderator authority in this community",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updatedAppeal = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.reddit_community_ban_appeals.update({
      where: { id: props.appealId },
      data: {
        status: props.body.status,
        moderator_response: props.body.moderator_response,
        reddit_community_moderator_id: props.moderator.id,
        updated_at: now,
      },
    });

    if (props.body.status === "approved") {
      await tx.reddit_community_community_bans.update({
        where: { id: appeal.reddit_community_community_ban_id },
        data: {
          status: "lifted",
          updated_at: now,
        },
      });
    }

    return updated;
  });

  return {
    id: updatedAppeal.id,
    reddit_community_community_ban_id:
      updatedAppeal.reddit_community_community_ban_id,
    appeal_text: updatedAppeal.appeal_text,
    status: typia.assert<
      "pending" | "approved" | "denied" | "expired_no_review"
    >(updatedAppeal.status),
    moderator_response:
      updatedAppeal.moderator_response === null
        ? undefined
        : updatedAppeal.moderator_response,
    reddit_community_moderator_id:
      updatedAppeal.reddit_community_moderator_id === null
        ? undefined
        : updatedAppeal.reddit_community_moderator_id,
    created_at: toISOStringSafe(updatedAppeal.created_at),
    updated_at: toISOStringSafe(updatedAppeal.updated_at),
    deleted_at:
      updatedAppeal.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedAppeal.deleted_at),
  };
}
