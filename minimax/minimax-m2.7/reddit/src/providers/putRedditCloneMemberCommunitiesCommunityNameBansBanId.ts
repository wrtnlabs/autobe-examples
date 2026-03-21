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

export async function putRedditCloneMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string & tags.Format<"uuid">;
  body: IRedditCloneUserKarma.IUpdate;
}): Promise<IRedditCloneUserKarma> {
  // Find community by name
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
  // Verify the requesting member is a moderator or owner of the community
  const isOwner = community.reddit_clone_member_id === props.member.id;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_community_id: community.id,
          reddit_clone_member_id: props.member.id,
        },
        select: { id: true },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Find the ban by id where community matches and deleted_at is null
  const existingBan = await MyGlobal.prisma.reddit_clone_bans.findUnique({
    where: { id: props.banId },
    select: {
      id: true,
      reddit_clone_community_id: true,
      deleted_at: true,
    },
  });
  if (existingBan === null) {
    throw new HttpException("Ban not found", 404);
  }
  if (existingBan.reddit_clone_community_id !== community.id) {
    throw new HttpException("Ban not found in this community", 404);
  }
  if (existingBan.deleted_at !== null) {
    throw new HttpException("Ban not found", 404);
  }
  // Build update data with only provided fields
  const updateData: Prisma.reddit_clone_bansUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.reason !== undefined) {
    updateData.reason = props.body.reason;
  }
  if (props.body.expires_at !== undefined) {
    updateData.expires_at = props.body.expires_at;
  }
  // Update the ban record
  await MyGlobal.prisma.reddit_clone_bans.update({
    where: { id: props.banId },
    data: updateData,
  });
  // Fetch updated ban with all relations for response
  const updatedBan = await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow({
    where: { id: props.banId },
    ...RedditCloneUserKarmaTransformer.select(),
  });
  return await RedditCloneUserKarmaTransformer.transform(updatedBan);
}
