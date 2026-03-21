import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneUserKarmaTransformer } from "../transformers/RedditCloneUserKarmaTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneUserKarma> {
  // Find community by name to verify existence
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { name: props.communityName },
    select: {
      id: true,
      reddit_clone_member_id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check authorization: requester must be owner or moderator
  const isOwner = community.reddit_clone_member_id === props.member.id;
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  if (!isOwner && moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Find ban with all nested relations using transformer
  const ban = await MyGlobal.prisma.reddit_clone_bans.findUnique({
    where: { id: props.banId },
    ...RedditCloneUserKarmaTransformer.select(),
  });
  if (ban === null) {
    throw new HttpException("Ban not found", 404);
  }
  // Soft-deleted ban returns 404
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban not found", 404);
  }
  // Ban belongs to different community returns 404
  if (ban.community.id !== community.id) {
    throw new HttpException("Ban not found", 404);
  }
  return await RedditCloneUserKarmaTransformer.transform(ban);
}
