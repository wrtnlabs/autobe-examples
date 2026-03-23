import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the ban record and verify it belongs to the specified community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      lifted_at: true,
    },
  });
  // Check if the ban is already lifted
  if (ban.lifted_at !== null) {
    throw new HttpException("Ban is already lifted", 409);
  }
  // Verify the requesting member is a moderator or owner of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_communities_id: props.communityId,
        reddit_clone_members_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Lift the ban by setting lifted_at to current timestamp
  await MyGlobal.prisma.reddit_clone_bans.update({
    where: {
      id: props.banId,
    },
    data: {
      lifted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
