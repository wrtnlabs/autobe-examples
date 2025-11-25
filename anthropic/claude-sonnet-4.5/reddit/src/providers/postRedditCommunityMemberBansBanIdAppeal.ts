import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberBansBanIdAppeal(props: {
  member: MemberPayload;
  banId: string & tags.Format<"uuid">;
  body: IRedditCommunityBanAppeal.ICreate;
}): Promise<IRedditCommunityBanAppeal> {
  const ban = await MyGlobal.prisma.reddit_community_community_bans.findUnique({
    where: { id: props.banId },
  });

  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }

  if (ban.reddit_community_member_id !== props.member.id) {
    throw new HttpException("You can only appeal your own bans", 403);
  }

  const existingAppeal =
    await MyGlobal.prisma.reddit_community_ban_appeals.findUnique({
      where: { reddit_community_community_ban_id: props.banId },
    });

  if (existingAppeal) {
    throw new HttpException("An appeal already exists for this ban", 409);
  }

  const created = await MyGlobal.prisma.reddit_community_ban_appeals.create({
    data: {
      id: v4(),
      reddit_community_community_ban_id: props.banId,
      appeal_text: props.body.appeal_text,
      status: "pending",
      moderator_response: null,
      reddit_community_moderator_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reddit_community_community_ban_id:
      created.reddit_community_community_ban_id,
    appeal_text: created.appeal_text,
    status: typia.assert<
      "pending" | "approved" | "denied" | "expired_no_review"
    >(created.status),
    moderator_response:
      created.moderator_response === null
        ? undefined
        : created.moderator_response,
    reddit_community_moderator_id:
      created.reddit_community_moderator_id === null
        ? undefined
        : created.reddit_community_moderator_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
