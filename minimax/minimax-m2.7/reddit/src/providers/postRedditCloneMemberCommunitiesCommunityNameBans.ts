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
import { RedditCloneUserKarmaCollector } from "../collectors/RedditCloneUserKarmaCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneUserKarmaTransformer } from "../transformers/RedditCloneUserKarmaTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCloneUserKarma.ICreate;
}): Promise<IRedditCloneUserKarma> {
  // 1. Lookup community by name
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: { name: props.communityName, deleted_at: null },
    select: { id: true, reddit_clone_member_id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify member is moderator or owner
  const moderatorRole = await MyGlobal.prisma.reddit_clone_moderators.findFirst(
    {
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
        deleted_at: null,
      },
      select: { id: true, role: true },
    },
  );
  if (!moderatorRole) {
    throw new HttpException("You do not have permission to ban users", 403);
  }
  // 3. Lookup target user by username
  const targetUser = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { username: props.body.bannedUsername, deleted_at: null },
    select: { id: true },
  });
  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }
  // 4. Cannot ban the community owner
  if (targetUser.id === community.reddit_clone_member_id) {
    throw new HttpException("Cannot ban the community owner", 403);
  }
  // 5. Check for existing active ban
  const existingBan = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      reddit_clone_community_id: community.id,
      reddit_clone_user_id: targetUser.id,
      deleted_at: null,
      OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (existingBan) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // 6. Create ban record using collector
  const created = await MyGlobal.prisma.reddit_clone_bans.create({
    data: await RedditCloneUserKarmaCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: community.id },
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
    }),
    ...RedditCloneUserKarmaTransformer.select(),
  });
  // 7. Return transformed result
  return await RedditCloneUserKarmaTransformer.transform(created);
}
